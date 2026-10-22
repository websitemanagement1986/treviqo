import { encryptRequest, decryptPayload } from "@/lib/paymate/crypto";
import { getPaymateConfig, type PaymateConfig } from "@/lib/paymate/config";

function getDetailedSummaryRows(
  payload: Record<string, unknown> | null | undefined,
): Record<string, unknown>[] {
  const raw = payload?.DetailedSummary;
  if (Array.isArray(raw)) {
    return raw.filter((row): row is Record<string, unknown> => row && typeof row === "object");
  }
  if (raw && typeof raw === "object") {
    return [raw as Record<string, unknown>];
  }
  const response = payload?.Response;
  if (response && typeof response === "object") {
    return [response as Record<string, unknown>];
  }
  return [];
}

function getDetailedSummary(payload: Record<string, unknown> | null | undefined) {
  const rows = getDetailedSummaryRows(payload);
  return rows[0] || null;
}

function rowPaymentUrl(row: Record<string, unknown> | null | undefined): string | null {
  if (!row) return null;
  const candidates = [row.PaymentURL, row.PaymentUrl, row.IntentURL, row.IntentUrl];
  const hit = candidates.find((value) => typeof value === "string" && value.length > 0);
  return (hit as string) || null;
}

function isFailedTransactionStatus(status: unknown): boolean {
  const code = String(status ?? "").trim();
  return code === "999" || code === "998" || code === "99";
}

export function extractPaymateMessage(payload: Record<string, unknown> | null | undefined): string | null {
  const rows = getDetailedSummaryRows(payload);
  for (const row of rows) {
    const statusMessage = String(row.StatusMessage || row.Message || "").trim();
    const txnStatus = row.TransactionStatus;
    const hasUrl = Boolean(rowPaymentUrl(row));
    if (statusMessage && (isFailedTransactionStatus(txnStatus) || !hasUrl)) {
      return statusMessage;
    }
  }

  const summary = getDetailedSummary(payload);
  const detail = (summary?.StatusMessage || summary?.Message) as string | undefined;
  const generic = (payload?.Description || payload?.ErrorDescription) as string | undefined;
  if (detail && generic && /invalid input/i.test(generic)) {
    return detail;
  }
  return (
    detail ||
    generic ||
    (payload?.message as string) ||
    (payload?.error as string) ||
    null
  );
}

export function extractPaymentUrl(payload: Record<string, unknown> | null | undefined): string | null {
  const summary = getDetailedSummary(payload);
  const response = payload?.Response as Record<string, unknown> | undefined;
  const detailed = payload?.DetailedSummary as Record<string, unknown> | undefined;
  const candidates = [
    response?.PaymentURL,
    response?.PaymentUrl,
    response?.IntentURL,
    response?.IntentUrl,
    summary?.PaymentURL,
    summary?.PaymentUrl,
    summary?.IntentURL,
    summary?.IntentUrl,
    detailed?.PaymentURL,
    detailed?.PaymentUrl,
    detailed?.IntentURL,
    detailed?.IntentUrl,
    payload?.PaymentURL,
    payload?.PaymentUrl,
    payload?.IntentURL,
    payload?.IntentUrl,
    payload?.CheckoutURL,
    payload?.checkoutUrl,
  ];
  return candidates.find((value) => typeof value === "string" && value.length > 0) as string | null;
}

export function isSuccessPayload(payload: Record<string, unknown> | null | undefined): boolean {
  const paymentUrl = extractPaymentUrl(payload);
  if (paymentUrl) return true;

  const rows = getDetailedSummaryRows(payload);
  if (rows.length > 0) {
    const anyUrl = rows.some((row) => rowPaymentUrl(row));
    const anyHardFail = rows.some((row) => isFailedTransactionStatus(row.TransactionStatus));
    if (anyHardFail && !anyUrl) return false;
    if (anyUrl) return true;
    return false;
  }

  const code = String(
    payload?.StatusCode || payload?.ErrorCode || payload?.statusCode || payload?.errorCode || ""
  );
  if (code === "000" || code === "0") return true;
  const description = String(payload?.Description || payload?.ErrorDescription || "").toLowerCase();
  return description.includes("success");
}

export function parsePayMateResponse(
  rawResponse: Record<string, unknown>,
  config: PaymateConfig
): Record<string, unknown> {
  const decrypted = decryptPayload(rawResponse, config.partnerPrivateKey, config.iv);
  if (decrypted) {
    return decrypted;
  }

  if (rawResponse && typeof rawResponse === "object") {
    return rawResponse;
  }

  throw new Error("Unexpected PayMate response format");
}

export class PaymateApiError extends Error {
  paymateDetails?: Record<string, unknown>;

  constructor(message: string, paymateDetails?: Record<string, unknown>) {
    super(message);
    this.name = "PaymateApiError";
    this.paymateDetails = paymateDetails;
  }
}

export async function callPayMate(plainPayload: object) {
  const config = getPaymateConfig();
  const encryptedBody = encryptRequest(plainPayload, config.paymatePublicCert, config.iv);

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      MerchantId: config.merchantId,
      TerminalId: config.terminalId,
      BusinessXpressID: config.businessXpressId,
    },
    body: JSON.stringify(encryptedBody),
  });

  const rawText = await response.text();
  let encryptedResponse: Record<string, unknown>;
  try {
    encryptedResponse = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    throw new Error(`PayMate returned non-JSON response (${response.status})`);
  }

  if (!response.ok && !encryptedResponse.EncryptedData && !encryptedResponse.StatusCode) {
    throw new Error(extractPaymateMessage(encryptedResponse) || `PayMate HTTP ${response.status}`);
  }

  const decrypted = parsePayMateResponse(encryptedResponse, config);
  if (!isSuccessPayload(decrypted)) {
    const message = extractPaymateMessage(decrypted) || "PayMate rejected the payment request";
    throw new PaymateApiError(message, decrypted);
  }

  return { decrypted, config };
}
