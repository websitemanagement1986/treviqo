/** PayMate expects amounts with 2 decimal places (e.g. "4.00", not "4"). */
export function formatPaymateAmount(amount: number): string {
  return amount.toFixed(2);
}

/** Invoice date in YYYY-MM-DD as used by live merchants. */
export function getPaymateInvoiceDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Empty-string fields present in working live merchant requests (must be sent, not omitted). */
export const PAYMATE_BLANK_FIELDS = {
  ContactXpressID: "",
  InvoiceTerm: "",
  GSTType: "",
  GST: "",
} as const;
