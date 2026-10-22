export const PAYMATE_METHODS = {
  upi: {
    label: "UPI",
    PaymentMode: "UPI",
    /** Treviqo merchant: UPI Intent (QRCode returns PayMate 178 on this account). */
    PaymentType: "Intent",
    includeIntentFields: true,
  },
  debit: {
    label: "Debit Card",
    PaymentMode: "DebitCard",
    PaymentType: "Card",
    includeIntentFields: false,
  },
  netbanking: {
    label: "Net Banking",
    PaymentMode: "NetBanking",
    PaymentType: "Banking",
    includeIntentFields: false,
  },
} as const;

export const DEFAULT_METHOD = "upi";

export type PaymateMethodKey = keyof typeof PAYMATE_METHODS;

export function resolvePaymateMethod(method?: string) {
  const key = String(method || DEFAULT_METHOD).toLowerCase() as PaymateMethodKey;
  const entry = PAYMATE_METHODS[key];
  if (!entry) {
    throw new Error(`Unsupported payment method: ${method}`);
  }
  return { key, ...entry };
}
