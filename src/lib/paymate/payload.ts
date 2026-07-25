/** PayMate expects amounts with 2 decimal places (e.g. "4.00", not "4"). */
export function formatPaymateAmount(amount: number): string {
  return amount.toFixed(2);
}

/** Invoice date in YYYY-MM-DD as used by live merchants. */
export function getPaymateInvoiceDate(): string {
  return new Date().toISOString().slice(0, 10);
}
