import { decryptPayload } from "@/lib/paymate/crypto";
import { getPaymateConfig } from "@/lib/paymate/config";
import { isSuccessPayload } from "@/lib/paymate/client";
import { getPendingOrder, markOrderPaid } from "@/lib/paymate/orders";
import { sendOrderEmails } from "@/lib/email";

export function extractOrderId(payload: Record<string, unknown> | null | undefined): string | null {
  const summary = payload?.DetailedSummary as Record<string, unknown> | undefined;
  const response = payload?.Response as Record<string, unknown> | undefined;
  return (
    (summary?.OrderID as string) ||
    (response?.OrderID as string) ||
    (payload?.OrderID as string) ||
    (payload?.OrderId as string) ||
    null
  );
}

export function extractTransactionId(payload: Record<string, unknown> | null | undefined): string | null {
  const summary = payload?.DetailedSummary as Record<string, unknown> | undefined;
  const response = payload?.Response as Record<string, unknown> | undefined;
  return (
    (summary?.TransactionRefNo as string) ||
    (response?.TransactionRefNo as string) ||
    (payload?.TransactionRefNo as string) ||
    (payload?.transactionRefNo as string) ||
    extractOrderId(payload)
  );
}

export async function finalizePaidOrder(orderId: string, payload: Record<string, unknown>) {
  const pending = getPendingOrder(orderId);
  if (!pending) {
    return { ok: false as const, error: "Unknown order" };
  }
  if (pending.status === "paid") {
    return { ok: true as const, alreadyProcessed: true, order: pending };
  }

  const transactionId = extractTransactionId(payload) || orderId;
  markOrderPaid(orderId, {
    transactionId,
    paymatePayload: payload,
  });

  await sendOrderEmails({
    transactionId,
    orderId,
    customer: pending.customer,
    items: pending.items,
    subtotal: pending.subtotal,
    deliveryCharge: pending.deliveryCharge,
    total: pending.total,
    paymentMethod: "online",
    paymentProvider: "paymate",
  });

  return {
    ok: true as const,
    transactionId,
    order: getPendingOrder(orderId),
  };
}

export function decryptCallbackBody(body: Record<string, unknown>) {
  const config = getPaymateConfig();
  if (body.EncryptedRandomKey || body.encryptedRandomKey) {
    const decrypted = decryptPayload(body, config.partnerPrivateKey, config.iv);
    if (decrypted) return decrypted;
  }
  return body;
}

export function isCallbackSuccess(payload: Record<string, unknown>) {
  return isSuccessPayload(payload);
}
