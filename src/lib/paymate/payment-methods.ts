export const PAYMATE_METHODS = {
  upi: {
    label: "UPI",
    PaymentMode: "UPI",
    PaymentType: "Intent",
    TargetApp: "GPAY",
    DeviceOS: "ANDROID",
  },
  debit: {
    label: "Debit Card",
    PaymentMode: "DebitCard",
    PaymentType: "Card",
  },
  netbanking: {
    label: "Net Banking",
    PaymentMode: "NetBanking",
    PaymentType: "Banking",
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
