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
import { buildCollectPaymentsPayload } from "@/lib/paymate/payload";

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

    const payload = buildCollectPaymentsPayload({
      orderId,
      referenceCode: config.referenceCode,
      companyName: customer.name,
      mobile: String(customer.phone).replace(/\D/g, "").slice(-10),
      email: customer.email,
      invoiceAmount: total,
      paymentMode: paymateMethod.PaymentMode,
      paymentType: paymateMethod.PaymentType,
      includeIntentFields: paymateMethod.includeIntentFields,
      returnUrl,
    });

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
