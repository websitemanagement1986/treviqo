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
  try {
    const body = await req.json();
    const { cart, customer } = body as { cart?: CartEntry[]; customer?: CustomerBody };

    if (!customer?.name || !customer?.email || !customer?.phone) {
      return NextResponse.json({ error: "Customer details are required" }, { status: 400 });
    }
    if (!customer.address || !customer.city || !customer.state || !customer.pincode) {
      return NextResponse.json({ error: "Delivery address is required for COD orders" }, { status: 400 });
    }

    const { items, subtotal, deliveryCharge, total } = validateCart(cart || []);
    const transactionId = `TRV-COD-${Date.now()}`;

    await sendOrderEmails({
      transactionId,
      orderId: transactionId,
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        pincode: customer.pincode,
      },
      items,
      subtotal,
      deliveryCharge,
      total,
      paymentMethod: "cod",
    });

    return NextResponse.json({
      success: true,
      transaction_id: transactionId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request" },
      { status: 400 }
    );
  }
}
