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
  referenceCode?: string;
  companyName?: string;
  mobile?: string;
  email?: string;
  invoiceAmount?: number;
  paymentMode?: string;
  paymentType?: string;
  targetApp?: string;
  deviceOS?: string;
  blankOverrides?: Record<string, string>;
  returnUrl?: string;
};

export function buildPaymateOrderId(style: "long" | "short" = "long"): string {
  if (style === "short") {
    return `UPIOITest${String(Date.now()).slice(-3)}`;
  }
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
    referenceCode = "",
    companyName = "Rahul Kumar",
    mobile = "9898989898",
    email = "xyz@yahoo.com",
    invoiceAmount = 100,
    paymentMode = "UPI",
    paymentType = "Intent",
    targetApp = "GPAY",
    deviceOS = "ANDROID",
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
  if (paymentMode === "UPI" && paymentType === "Intent") {
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

/** Field-by-field diff vs a known working live merchant payload. */
export function diffAgainstWorkingMerchant(payload: ReturnType<typeof buildCollectPaymentsPayload>) {
  const item = payload.CollectionDetails[0];
  const tx = item.TransactionDetails as {
    OrderID: string;
    CompanyName: string;
    ReferenceCode: string;
    ReceipentMobileNo: string;
    RecipentEmailAddress: string;
    ContactXpressID: string;
    UDF1: unknown[];
    UDF2: unknown[];
  };
  const inv = item.INVOICE;
  const pm = item.PaymentMethod;

  const working = {
    OrderID: "1TXNP260725092611352467 (long numeric)",
    CompanyName: "Rakesh Kumar",
    ReferenceCode: "RF191925 (merchant-specific; Treviqo may use blank)",
    ReceipentMobileNo: "9898989898",
    RecipentEmailAddress: "filled email",
    UDF1: "[]",
    InvoiceNumber: "INV + OrderID",
    InvoiceStartDate: "YYYY-MM-DD",
    InvoiceAmount: "4.00",
    PaymentMode: "UPI",
    PaymentType: "Intent",
    TargetApp: "GPAY",
    DeviceOS: "ANDROID",
    blank_fields: PAYMATE_BLANK_FIELDS,
  };

  const ours = {
    OrderID: tx.OrderID,
    CompanyName: tx.CompanyName,
    ReferenceCode: tx.ReferenceCode,
    ReceipentMobileNo: tx.ReceipentMobileNo,
    RecipentEmailAddress: tx.RecipentEmailAddress,
    UDF1: JSON.stringify(tx.UDF1),
    InvoiceNumber: inv.InvoiceNumber,
    InvoiceStartDate: inv.InvoiceStartDate,
    InvoiceAmount: inv.InvoiceAmount,
    PaymentMode: pm.PaymentMode,
    PaymentType: pm.PaymentType,
    TargetApp: pm.TargetApp,
    DeviceOS: pm.DeviceOS,
    blank_fields: {
      ContactXpressID: tx.ContactXpressID,
      InvoiceTerm: inv.InvoiceTerm,
      GSTType: inv.GSTType,
      GST: inv.GST,
    },
  };

  const mismatches: string[] = [];
  if (!tx.ReceipentMobileNo) mismatches.push("ReceipentMobileNo empty");
  if (!tx.RecipentEmailAddress) mismatches.push("RecipentEmailAddress empty");
  if (!inv.InvoiceNumber) mismatches.push("InvoiceNumber empty");
  if (!inv.InvoiceStartDate) mismatches.push("InvoiceStartDate empty");
  if (!/^\d+\.\d{2}$/.test(inv.InvoiceAmount)) mismatches.push("InvoiceAmount missing .00 decimals");
  if (tx.UDF1.length > 0 || tx.UDF2.length > 0) mismatches.push("UDF1/UDF2 should be []");
  if (pm.PaymentMode !== "UPI" || pm.PaymentType !== "Intent") mismatches.push("PaymentMode/Type not UPI Intent");

  return { working_reference: working, ours, mismatches, structure_matches_working: mismatches.length === 0 };
}
