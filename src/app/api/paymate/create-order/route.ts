import { NextRequest, NextResponse } from "next/server";
import { validateCart } from "@/lib/validate-cart";
import {
  callPayMate,
  extractPaymentUrl,
  extractPaymateMessage,
  isSuccessPayload,
  PaymateApiError,
} from "@/lib/paymate/client";
import { getPaymateConfig } from "@/lib/paymate/config";
import { resolvePaymateMethod } from "@/lib/paymate/payment-methods";
import { savePendingOrder } from "@/lib/paymate/orders";

function buildOrderId() {
  return `TRV${Date.now()}`.slice(0, 20);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cart, customer, payment_method: paymentMethod } = body || {};

    if (!customer?.name || !customer?.email || !customer?.phone) {
      return NextResponse.json({ error: "Customer details are required" }, { status: 400 });
    }

    const { items, subtotal, deliveryCharge, total } = validateCart(cart);
    const config = getPaymateConfig();
    const paymateMethod = resolvePaymateMethod(paymentMethod);
    const orderId = buildOrderId();
    const returnUrl = `${config.siteUrl}/paymate-return?orderId=${encodeURIComponent(orderId)}`;

    const paymentMethodObj: Record<string, string> = {
      PaymentMode: paymateMethod.PaymentMode,
      PaymentType: paymateMethod.PaymentType,
    };
    if (paymateMethod.PaymentType === "Intent") {
      paymentMethodObj.TargetApp = "GPAY";
      paymentMethodObj.DeviceOS = "ANDROID";
    }

    const payload = {
      CollectionDetails: [
        {
          TransactionDetails: {
            OrderID: orderId,
            CompanyName: customer.name,
            ReferenceCode: config.referenceCode,
            ContactXpressID: "",
            ReceipentMobileNo: String(customer.phone).replace(/\D/g, "").slice(-10),
            RecipentEmailAddress: customer.email,
            UDF1: [{ order: orderId }],
            UDF2: [{ site: "treviqo" }],
            UDF3: [],
            Remarks: "Payments",
            ReturnURL: returnUrl,
          },
          INVOICE: {
            InvoiceNumber: orderId,
            InvoiceStartDate: "",
            InvoiceTerm: "",
            InvoiceAmount: String(total),
            GSTType: "",
            GST: "",
          },
          PaymentMethod: paymentMethodObj,
          SplitMDR: {
            BuyerCharges: "0",
            SupplierCharges: "100",
          },
        },
      ],
    };

    savePendingOrder(orderId, {
      customer,
      items,
      subtotal,
      deliveryCharge,
      total,
      returnUrl,
      paymentMethod: paymateMethod.key,
      paymatePaymentMode: paymateMethod.PaymentMode,
      paymatePaymentType: paymateMethod.PaymentType,
    });

    const { decrypted } = await callPayMate(payload);
    if (!isSuccessPayload(decrypted)) {
      const message = extractPaymateMessage(decrypted) || "PayMate rejected the payment request";
      return NextResponse.json({ error: message, details: decrypted }, { status: 502 });
    }

    const paymentUrl = extractPaymentUrl(decrypted);
    if (!paymentUrl) {
      return NextResponse.json(
        { error: "PayMate did not return a payment URL", details: decrypted },
        { status: 502 }
      );
    }

    const response = decrypted.Response as Record<string, unknown> | undefined;
    const summary = decrypted.DetailedSummary as Record<string, unknown> | undefined;

    return NextResponse.json({
      order_id: orderId,
      payment_url: paymentUrl,
      transaction_ref: response?.TransactionRefNo || summary?.TransactionRefNo || null,
      amount: total,
      payment_method: paymateMethod.key,
    });
  } catch (err) {
    if (err instanceof PaymateApiError) {
      return NextResponse.json(
        { error: err.message, details: err.paymateDetails },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create order" },
      { status: 400 }
    );
  }
}
