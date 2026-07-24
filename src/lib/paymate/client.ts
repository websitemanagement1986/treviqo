import { encryptRequest, decryptPayload } from "@/lib/paymate/crypto";
import { getPaymateConfig, type PaymateConfig } from "@/lib/paymate/config";

function getDetailedSummary(payload: Record<string, unknown> | null | undefined) {
  if (Array.isArray(payload?.DetailedSummary)) {
    return (payload.DetailedSummary[0] as Record<string, unknown>) || null;
  }
  return (payload?.DetailedSummary as Record<string, unknown>) || (payload?.Response as Record<string, unknown>) || null;
}

export function extractPaymateMessage(payload: Record<string, unknown> | null | undefined): string | null {
  const summary = getDetailedSummary(payload);
  const detail = (summary?.StatusMessage || summary?.Message) as string | undefined;
  const generic = (payload?.Description || payload?.ErrorDescription) as string | undefined;
  if (detail && generic && /invalid input/i.test(generic)) {
    return detail;
  }
  return (
    generic ||
    detail ||
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
    summary?.PaymentURL,
    summary?.PaymentUrl,
    detailed?.PaymentURL,
    detailed?.PaymentUrl,
    payload?.PaymentURL,
    payload?.PaymentUrl,
    payload?.CheckoutURL,
    payload?.checkoutUrl,
  ];
  return candidates.find((value) => typeof value === "string" && value.length > 0) as string | null;
}

export function isSuccessPayload(payload: Record<string, unknown> | null | undefined): boolean {
  const code = String(
    payload?.StatusCode || payload?.ErrorCode || payload?.statusCode || payload?.errorCode || ""
  );
  if (code === "000" || code === "0") return true;
  if (extractPaymentUrl(payload)) return true;
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
