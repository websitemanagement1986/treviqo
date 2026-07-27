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

export type CollectPaymentsOptions = {
  orderId: string;
  /** Registered merchant reference — Treviqo must use TREVIQO01 (blank fails on v2). */
  referenceCode?: string;
  companyName?: string;
  mobile?: string;
  email?: string;
  invoiceAmount?: number;
  paymentMode?: string;
  paymentType?: string;
  targetApp?: string;
  deviceOS?: string;
  /** When false, omit TargetApp/DeviceOS even for UPI (checkout VPA/QRCode flow). */
  includeIntentFields?: boolean;
  blankOverrides?: Record<string, string>;
  returnUrl?: string;
};

export function buildPaymateOrderId(): string {
  const now = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  const dd = pad(now.getDate());
  const mm = pad(now.getMonth() + 1);
  const yy = String(now.getFullYear()).slice(-2);
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  const rnd = pad(Math.floor(Math.random() * 1000000000), 9);
  return `TRV${dd}${mm}${yy}${hh}${min}${ss}${rnd}`.slice(0, 24);
}

export function buildCollectPaymentsPayload(options: CollectPaymentsOptions) {
  const {
    orderId,
    referenceCode = "TREVIQO01",
    companyName = "Rahul Kumar",
    mobile = "9898989898",
    email = "xyz@yahoo.com",
    invoiceAmount = 100,
    paymentMode = "UPI",
    paymentType = "Intent",
    targetApp = "GPAY",
    deviceOS = "ANDROID",
    includeIntentFields = paymentType === "Intent",
    blankOverrides = {},
    returnUrl,
  } = options;

  const transactionDetails: Record<string, unknown> = {
    OrderID: orderId,
    CompanyName: companyName,
    ReferenceCode: blankOverrides.ReferenceCode ?? referenceCode,
    ContactXpressID: blankOverrides.ContactXpressID ?? PAYMATE_BLANK_FIELDS.ContactXpressID,
    ReceipentMobileNo: mobile,
    RecipentEmailAddress: email,
    UDF1: [],
    UDF2: [],
    UDF3: [],
    Remarks: "Payments",
  };
  if (returnUrl) {
    transactionDetails.ReturnURL = returnUrl;
  }

  const paymentMethod: Record<string, string> = {
    PaymentMode: paymentMode,
    PaymentType: paymentType,
  };
  if (paymentMode === "UPI" && includeIntentFields) {
    paymentMethod.TargetApp = targetApp;
    paymentMethod.DeviceOS = deviceOS;
  }

  return {
    CollectionDetails: [
      {
        TransactionDetails: transactionDetails,
        INVOICE: {
          InvoiceNumber: `INV${orderId}`,
          InvoiceStartDate: getPaymateInvoiceDate(),
          InvoiceTerm: blankOverrides.InvoiceTerm ?? PAYMATE_BLANK_FIELDS.InvoiceTerm,
          InvoiceAmount: formatPaymateAmount(invoiceAmount),
          GSTType: blankOverrides.GSTType ?? PAYMATE_BLANK_FIELDS.GSTType,
          GST: blankOverrides.GST ?? PAYMATE_BLANK_FIELDS.GST,
        },
        PaymentMethod: paymentMethod,
        SplitMDR: {
          BuyerCharges: "0",
          SupplierCharges: "100",
        },
      },
    ],
  };
}
