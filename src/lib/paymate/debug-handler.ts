/**
 * Lean PayMate connectivity + payment status debug for Hostinger.
 * Production path: v2 CollectPayments + ReferenceCode TREVIQO01 + UPI Intent.
 */
import { encryptRequest } from "@/lib/paymate/crypto";
import { getPaymateConfig } from "@/lib/paymate/config";
import {
  callPayMate,
  extractPaymateMessage,
  extractPaymentUrl,
  isSuccessPayload,
  PaymateApiError,
  parsePayMateResponse,
} from "@/lib/paymate/client";
import { buildCollectPaymentsPayload, buildPaymateOrderId } from "@/lib/paymate/payload";
import { getPendingOrder, listPendingOrders } from "@/lib/paymate/orders";

function maskId(value: string) {
  if (!value || value.length < 8) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function maskCustomer(customer: Record<string, unknown> | undefined) {
  if (!customer) return null;
  const email = String(customer.email || "");
  const phone = String(customer.phone || "");
  return {
    name: customer.name || null,
    email: email ? `${email.slice(0, 2)}***@***` : null,
    phone: phone ? `******${phone.slice(-4)}` : null,
  };
}

function authorizeDebug(debugKey?: string | null) {
  const expectedKey = process.env.PAYMATE_DEBUG_KEY;
  if (expectedKey && debugKey !== expectedKey) {
    return { ok: false as const, status: 401, body: { error: "Unauthorized" } };
  }
  return { ok: true as const };
}

function configSummary(config: ReturnType<typeof getPaymateConfig>) {
  return {
    endpoint: config.endpoint,
    api_version: config.apiVersion,
    reference_code: config.referenceCode,
    business_xpress_id: config.businessXpressId,
    merchant_id: maskId(config.merchantId),
    terminal_id: maskId(config.terminalId),
  };
}

/** Raw PayMate POST that never throws on business StatusCode — for status debug. */
async function rawPaymateCall(plainPayload: object) {
  const config = getPaymateConfig();
  const encryptedBody = encryptRequest(plainPayload, config.paymatePublicCert, config.iv);
  const t0 = Date.now();
  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      MerchantId: config.merchantId,
      TerminalId: config.terminalId,
      BusinessXpressID: config.businessXpressId,
    },
    body: JSON.stringify(encryptedBody),
    signal: AbortSignal.timeout(15000),
  });
  const rawText = await response.text();
  let encryptedResponse: Record<string, unknown>;
  try {
    encryptedResponse = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    return {
      duration_ms: Date.now() - t0,
      http_status: response.status,
      plain_text_payload: plainPayload,
      encrypted_request: true,
      raw_preview: rawText.slice(0, 500),
      parsed: null,
      status_code: null,
      description: null,
      message: `Non-JSON response (${response.status})`,
      success: false,
    };
  }

  let parsed: Record<string, unknown> | null = null;
  let decryptError: string | null = null;
  try {
    parsed = parsePayMateResponse(encryptedResponse, config);
  } catch (err) {
    decryptError = err instanceof Error ? err.message : String(err);
    parsed = encryptedResponse;
  }

  return {
    duration_ms: Date.now() - t0,
    http_status: response.status,
    plain_text_payload: plainPayload,
    encrypted_request: true,
    decrypt_error: decryptError,
    parsed,
    status_code: parsed?.StatusCode ?? null,
    description: parsed?.Description ?? null,
    message: extractPaymateMessage(parsed),
    success: isSuccessPayload(parsed),
  };
}

export async function runPaymateDebug(debugKey?: string | null) {
  const auth = authorizeDebug(debugKey);
  if (!auth.ok) return auth;

  try {
    const config = getPaymateConfig();
    const orderId = buildPaymateOrderId();
    const payload = buildCollectPaymentsPayload({
      orderId,
      referenceCode: config.referenceCode,
      invoiceAmount: 1,
      paymentMode: "UPI",
      paymentType: "Intent",
      includeIntentFields: true,
    });

    const t0 = Date.now();
    try {
      const { decrypted } = await callPayMate(payload);
      const paymentUrl = extractPaymentUrl(decrypted);
      return {
        status: 200,
        body: {
          checked_at: new Date().toISOString(),
          mode: "collect",
          config: configSummary(config),
          paymate_call: {
            duration_ms: Date.now() - t0,
            order_id: orderId,
            plain_text_payload: payload,
            status_code: decrypted?.StatusCode ?? null,
            description: decrypted?.Description ?? null,
            message: extractPaymateMessage(decrypted),
            payment_url: paymentUrl,
            payment_url_scheme: paymentUrl ? paymentUrl.split(":")[0] : null,
            success: isSuccessPayload(decrypted),
            response: decrypted,
          },
          note:
            "Collect smoke test. For payment status: GET /api/paymate/debug-status?orderId=YOUR_ORDER_ID",
        },
      };
    } catch (err) {
      if (err instanceof PaymateApiError) {
        const details = err.paymateDetails || {};
        return {
          status: 200,
          body: {
            checked_at: new Date().toISOString(),
            mode: "collect",
            config: configSummary(config),
            paymate_call: {
              duration_ms: Date.now() - t0,
              order_id: orderId,
              plain_text_payload: payload,
              status_code: details.StatusCode ?? null,
              description: details.Description ?? null,
              message: err.message,
              payment_url: extractPaymentUrl(details),
              success: false,
              response: details,
            },
            note:
              "Collect smoke test. For payment status: GET /api/paymate/debug-status?orderId=YOUR_ORDER_ID",
          },
        };
      }
      throw err;
    }
  } catch (err) {
    return {
      status: 500,
      body: {
        error: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

/**
 * Debug payment status for an existing orderId.
 * - Shows local pending store
 * - Calls PayMate inquiry (same shape as /api/paymate/status) with full request/response
 * - Does not finalize / mark paid (read-only debug)
 */
export async function runPaymateStatusDebug(orderId?: string | null, debugKey?: string | null) {
  const auth = authorizeDebug(debugKey);
  if (!auth.ok) return auth;

  try {
    const config = getPaymateConfig();

    if (!orderId) {
      const recent = listPendingOrders(20).map((o) => ({
        orderId: o.orderId,
        status: o.status,
        total: o.total,
        createdAt: o.createdAt,
        paidAt: o.paidAt || null,
        transactionId: o.transactionId || null,
        paymentMethod: o.paymentMethod,
      }));
      return {
        status: 200,
        body: {
          checked_at: new Date().toISOString(),
          mode: "status_list",
          config: configSummary(config),
          recent_orders: recent,
          usage: "GET /api/paymate/debug-status?orderId=TRV...",
          note: "Pass orderId to run PayMate status inquiry for that order.",
        },
      };
    }

    const pending = getPendingOrder(orderId);
    const inquiryPayload = {
      OrderId: orderId,
      TransactionRefNo: pending?.transactionId || "",
      FromDate: "",
      ToDate: "",
    };

    // Alternate inquiry shapes sometimes used in PayMate docs
    const inquiryVariants = [
      { id: "orderId_txnRef", payload: inquiryPayload },
      {
        id: "orderID_only",
        payload: { OrderID: orderId, OrderId: orderId },
      },
    ];

    const inquiries: Record<string, unknown>[] = [];
    for (const variant of inquiryVariants) {
      try {
        const result = await rawPaymateCall(variant.payload);
        inquiries.push({ id: variant.id, ...result });
      } catch (err) {
        inquiries.push({
          id: variant.id,
          error: err instanceof Error ? err.message : String(err),
          plain_text_payload: variant.payload,
          success: false,
        });
      }
    }

    const best =
      inquiries.find((r) => r.success) ||
      inquiries.find((r) => r.parsed) ||
      inquiries[0] ||
      null;

    const summary = Array.isArray((best as { parsed?: { DetailedSummary?: unknown } })?.parsed?.DetailedSummary)
      ? ((best as { parsed: { DetailedSummary: unknown[] } }).parsed.DetailedSummary[0] as Record<
          string,
          unknown
        >)
      : ((best as { parsed?: { DetailedSummary?: Record<string, unknown> } })?.parsed
          ?.DetailedSummary as Record<string, unknown> | undefined);

    return {
      status: 200,
      body: {
        checked_at: new Date().toISOString(),
        mode: "status",
        config: configSummary(config),
        order_id: orderId,
        local_pending: pending
          ? {
              status: pending.status,
              total: pending.total,
              createdAt: pending.createdAt,
              paidAt: pending.paidAt || null,
              failedAt: pending.failedAt || null,
              failureReason: pending.failureReason || null,
              transactionId: pending.transactionId || null,
              paymentMethod: pending.paymentMethod,
              paymatePaymentMode: pending.paymatePaymentMode,
              paymatePaymentType: pending.paymatePaymentType,
              customer: maskCustomer(pending.customer as unknown as Record<string, unknown>),
              item_count: pending.items?.length ?? 0,
            }
          : null,
        local_pending_found: Boolean(pending),
        inquiry_variants: inquiries,
        interpretation: {
          local_status: pending?.status || "not_in_local_store",
          paymate_status_code: (best as { status_code?: string })?.status_code ?? null,
          paymate_description: (best as { description?: string })?.description ?? null,
          paymate_message: (best as { message?: string })?.message ?? null,
          detailed_status:
            summary?.Status || summary?.StatusMessage || summary?.TransactionStatus || null,
          likely_paid:
            pending?.status === "paid" ||
            String(summary?.Status || summary?.StatusMessage || "")
              .toLowerCase()
              .match(/paid|success|completed/) != null,
        },
        note:
          "Read-only debug — does not mark the order paid. Use /api/paymate/status?orderId= for production finalize flow.",
      },
    };
  } catch (err) {
    return {
      status: 500,
      body: {
        error: err instanceof Error ? err.message : String(err),
      },
    };
  }
}
