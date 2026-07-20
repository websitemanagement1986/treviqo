import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { sendOrderEmails } from "@/lib/email";
import { validateCart, type CartEntry } from "@/lib/validate-cart";

interface CustomerBody {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export async function POST(req: NextRequest) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      customer,
      cart,
    } = body as {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
      customer?: CustomerBody;
      cart?: CartEntry[];
    };

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
    }

    const expectedSig = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSig !== razorpay_signature) {
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
    }

    const { items, subtotal, deliveryCharge, total } = validateCart(cart || []);

    if (customer?.name && customer?.email && customer?.phone) {
      await sendOrderEmails({
        transactionId: razorpay_payment_id,
        orderId: razorpay_order_id,
        customer: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address || "",
          city: customer.city || "",
          state: customer.state || "",
          pincode: customer.pincode || "",
        },
        items,
        subtotal,
        deliveryCharge,
        total,
        paymentMethod: "online",
      });
    }

    return NextResponse.json({
      success: true,
      transaction_id: razorpay_payment_id,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verification failed" },
      { status: 400 }
    );
  }
}
