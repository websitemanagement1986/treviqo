import { callPayMate, isSuccessPayload } from "@/lib/paymate/client";
import {
  extractTransactionId,
  finalizePaidOrder,
} from "@/lib/paymate/finalize";
import { getPendingOrder, type PendingOrder } from "@/lib/paymate/orders";

const RESERVED_ORDER_IDS = new Set([
  "intent",
  "status",
  "callback",
  "create-order",
  "debug",
  "debug-status",
  "debug-ip",
]);

function getDetailedSummary(payload: Record<string, unknown> | null | undefined) {
  if (!payload) return null;
  if (Array.isArray(payload.DetailedSummary)) {
    return (payload.DetailedSummary[0] as Record<string, unknown>) || null;
  }
  return (
    (payload.DetailedSummary as Record<string, unknown>) ||
    (payload.Response as Record<string, unknown>) ||
    null
  );
}

export function isReservedPartnerOrderId(orderId: string): boolean {
  return RESERVED_ORDER_IDS.has(orderId.toLowerCase());
}

export function extractPartnerRrn(
  payload: Record<string, unknown> | null | undefined,
  fallback?: string | null
): string | null {
  const summary = getDetailedSummary(payload);
  const candidates = [
    summary?.UTR,
    summary?.RRN,
    summary?.TransactionRefNo,
    summary?.BankRRN,
    payload?.UTR,
    payload?.RRN,
    payload?.TransactionRefNo,
  ];
  const found = candidates.find((v) => typeof v === "string" && v.length > 0) as string | undefined;
  if (found) return found;
  if (fallback) return fallback;
  if (payload) return extractTransactionId(payload);
  return null;
}

export function extractPartnerTransactionStatus(
  payload: Record<string, unknown> | null | undefined,
  localStatus?: PendingOrder["status"]
): string {
  const summary = getDetailedSummary(payload);
  const candidates = [
    summary?.StatusMessage,
    summary?.Status,
    summary?.TransactionStatus,
    payload?.StatusMessage,
    payload?.Status,
    payload?.TransactionStatus,
  ];
  for (const value of candidates) {
    if (value != null && String(value).trim()) {
      return String(value).trim();
    }
  }
  if (localStatus === "paid") return "SUCCESS";
  if (localStatus === "failed") return "FAILED";
  if (localStatus === "pending") return "PENDING";
  return "UNKNOWN";
}

export function extractPartnerAmount(
  payload: Record<string, unknown> | null | undefined,
  localTotal?: number
): number | null {
  if (localTotal != null && Number.isFinite(localTotal)) return localTotal;
  const summary = getDetailedSummary(payload);
  const candidates = [summary?.PayableAmount, summary?.Amount, payload?.PayableAmount, payload?.Amount];
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function isPaymatePaymentCompleted(payload: Record<string, unknown> | null | undefined): boolean {
  if (!payload || !isSuccessPayload(payload)) return false;
  const summary = getDetailedSummary(payload);
  const paymentStatus = String(
    summary?.Status || summary?.StatusMessage || payload.Status || ""
  ).toLowerCase();
  return (
    paymentStatus.includes("paid") ||
    paymentStatus.includes("success") ||
    paymentStatus.includes("completed")
  );
}

export type PartnerStatusResult = {
  httpStatus: number;
  body: {
    status: string;
    message: string;
    orderId: string;
    rrn: string | null;
    amount: number | null;
  };
};

export async function getPartnerOrderStatus(orderId: string): Promise<PartnerStatusResult> {
  const pending = getPendingOrder(orderId);
  if (!pending) {
    return {
      httpStatus: 404,
      body: {
        status: "FAILED",
        message: "Order not found",
        orderId,
        rrn: null,
        amount: null,
      },
    };
  }

  let paymatePayload: Record<string, unknown> | null = pending.paymatePayload || null;
  let current = pending;

  if (current.status !== "paid") {
    const inquiryPayload = {
      OrderId: orderId,
      TransactionRefNo: current.transactionId || "",
      FromDate: "",
      ToDate: "",
    };

    try {
      const { decrypted } = await callPayMate(inquiryPayload);
      paymatePayload = decrypted;
      if (isPaymatePaymentCompleted(decrypted)) {
        const result = await finalizePaidOrder(orderId, decrypted);
        if (result.ok) {
          current = getPendingOrder(orderId) || current;
          paymatePayload = decrypted;
        }
      }
    } catch {
      // Inquiry may fail or use a different shape; fall back to local state.
    }
  }

  const transactionStatus = extractPartnerTransactionStatus(paymatePayload, current.status);
  const rrn =
    extractPartnerRrn(paymatePayload, current.transactionId) ||
    current.transactionId ||
    null;
  const amount = extractPartnerAmount(paymatePayload, current.total);

  let message = "Transaction detail found.";
  if (current.status === "pending" && !isPaymatePaymentCompleted(paymatePayload)) {
    message = "Payment is still pending.";
  } else if (current.status === "failed") {
    message = current.failureReason || "Payment failed.";
  }

  return {
    httpStatus: 200,
    body: {
      status: transactionStatus,
      message,
      orderId,
      rrn,
      amount,
    },
  };
}
