import { NextRequest, NextResponse } from "next/server";
import {
  callPayMate,
  extractPaymentUrl,
  extractPaymateMessage,
  isSuccessPayload,
  PaymateApiError,
} from "@/lib/paymate/client";
import { getPaymateConfig } from "@/lib/paymate/config";
import { buildCollectPaymentsPayload, buildPaymateOrderId } from "@/lib/paymate/payload";
import { savePendingOrder } from "@/lib/paymate/orders";
import { authorizePartnerRequest } from "@/lib/paymate/partner-auth";

type IntentRequestBody = {
  amount?: number | string;
  customerName?: string;
  phone?: string;
  email?: string;
  orderId?: string;
};

/**
 * External partner API: create UPI Intent payment and return intentLink.
 *
 * POST /api/paymate/intent
 * Headers: X-API-Key: <PAYMATE_PARTNER_API_KEY>  (or Authorization: Bearer ...)
 * Body: { amount, customerName, phone, email?, orderId? }
 * Response: { status, message, amount, orderId, intentLink }
 */
export async function POST(req: NextRequest) {
  const auth = authorizePartnerRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ status: "FAILED", message: auth.error }, { status: auth.status });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as IntentRequestBody;
    const amount = Number(body.amount);
    const customerName = String(body.customerName || "").trim();
    const phoneRaw = String(body.phone || "").replace(/\D/g, "");
    const phone = phoneRaw.slice(-10);
    const email = String(body.email || "").trim() || "noreply@treviqo.co.in";
    const providedOrderId = String(body.orderId || "").trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { status: "FAILED", message: "amount must be a positive number" },
        { status: 400 }
      );
    }
    if (!customerName) {
      return NextResponse.json(
        { status: "FAILED", message: "customerName is required" },
        { status: 400 }
      );
    }
    if (phone.length !== 10) {
      return NextResponse.json(
        { status: "FAILED", message: "phone must be a 10-digit mobile number" },
        { status: 400 }
      );
    }

    const config = getPaymateConfig();
    const orderId = providedOrderId || buildPaymateOrderId();
    const returnUrl = `${config.siteUrl}/paymate-return?orderId=${encodeURIComponent(orderId)}`;

    const payload = buildCollectPaymentsPayload({
      orderId,
      referenceCode: config.referenceCode,
      companyName: customerName,
      mobile: phone,
      email,
      invoiceAmount: amount,
      paymentMode: "UPI",
      paymentType: "Intent",
      returnUrl,
    });

    savePendingOrder(orderId, {
      customer: {
        name: customerName,
        email,
        phone,
        address: "",
        city: "",
        state: "",
        pincode: "",
      },
      items: [
        {
          id: "partner-intent",
          name: "Partner payment",
          price: amount,
          qty: 1,
          lineTotal: amount,
          size: "",
          color: "",
        },
      ],
      subtotal: amount,
      deliveryCharge: 0,
      total: amount,
      returnUrl,
      paymentMethod: "upi_intent",
      paymatePaymentMode: "UPI",
      paymatePaymentType: "Intent",
    });

    const { decrypted } = await callPayMate(payload);
    if (!isSuccessPayload(decrypted)) {
      const message = extractPaymateMessage(decrypted) || "PayMate rejected the payment request";
      return NextResponse.json(
        { status: "FAILED", message, amount, orderId, intentLink: null },
        { status: 502 }
      );
    }

    const intentLink = extractPaymentUrl(decrypted);
    if (!intentLink) {
      return NextResponse.json(
        {
          status: "FAILED",
          message: "PayMate did not return a payment URL",
          amount,
          orderId,
          intentLink: null,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      status: "SUCCESS",
      message: "Intent Request Generated Successfully",
      amount,
      orderId,
      intentLink,
    });
  } catch (err) {
    if (err instanceof PaymateApiError) {
      return NextResponse.json(
        {
          status: "FAILED",
          message: err.message,
          amount: null,
          orderId: null,
          intentLink: null,
        },
        { status: 502 }
      );
    }
    return NextResponse.json(
      {
        status: "FAILED",
        message: err instanceof Error ? err.message : "Failed to generate intent",
        amount: null,
        orderId: null,
        intentLink: null,
      },
      { status: 400 }
    );
  }
}
