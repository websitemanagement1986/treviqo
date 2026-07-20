import { NextRequest, NextResponse } from "next/server";
import { validateCart, type CartEntry } from "@/lib/validate-cart";

interface CustomerBody {
  name?: string;
  email?: string;
  phone?: string;
}

export async function POST(req: NextRequest) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return NextResponse.json(
      { error: "Payment gateway not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { cart, customer } = body as { cart?: CartEntry[]; customer?: CustomerBody };

    if (!customer?.name || !customer?.email || !customer?.phone) {
      return NextResponse.json({ error: "Customer details are required" }, { status: 400 });
    }

    const { items, amountPaise } = validateCart(cart || []);
    const receipt = `trv_${Date.now()}`;
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt,
        notes: {
          customer_name: customer.name,
          customer_email: customer.email,
          items: JSON.stringify(items.map((i) => `${i.name} x${i.qty}`)),
        },
      }),
    });

    const order = await orderRes.json();
    if (!orderRes.ok) {
      return NextResponse.json(
        { error: order.error?.description || "Failed to create Razorpay order" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request" },
      { status: 400 }
    );
  }
}
