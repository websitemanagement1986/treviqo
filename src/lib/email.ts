import { getSiteConfig } from "@/lib/site-loader";
import type { ValidatedLineItem } from "@/lib/validate-cart";

interface Customer {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

interface OrderEmailPayload {
  transactionId: string;
  orderId: string;
  customer: Customer;
  items: ValidatedLineItem[];
  subtotal: number;
  deliveryCharge: number;
  total: number;
  paymentMethod: "cod" | "online";
}

async function sendViaResend(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL || "orders@treviqo.co.in";
  const { site } = getSiteConfig();

  if (!apiKey) {
    console.log(`[EMAIL SKIPPED] To: ${to}, Subject: ${subject}`);
    return { skipped: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: `${site.name} <${from}>`,
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Failed to send email");
  }
  return res.json();
}

function buildOrderHtml(payload: OrderEmailPayload, isAdmin: boolean) {
  const { site } = getSiteConfig();
  const { transactionId, customer, items, subtotal, deliveryCharge, total, paymentMethod } =
    payload;

  const itemRows = items
    .map(
      (i) =>
        `<tr><td>${i.name} (${i.size}, ${i.color})</td><td>${i.qty}</td><td>₹${i.lineTotal.toLocaleString("en-IN")}</td></tr>`
    )
    .join("");

  const deliveryRow = deliveryCharge
    ? `<tr><td colspan="2">Delivery</td><td style="text-align:right;">₹${deliveryCharge.toLocaleString("en-IN")}</td></tr>`
    : `<tr><td colspan="2">Delivery</td><td style="text-align:right;">FREE</td></tr>`;

  const payLabel =
    paymentMethod === "cod" ? "Cash on Delivery" : "Paid Online via Razorpay";
  const title = isAdmin ? `New Order — ${site.name}` : `Order Confirmation — ${site.name}`;
  const greeting = isAdmin
    ? `<p>A new order has been placed on ${site.name}.</p>`
    : `<p>Dear ${customer.name},</p><p>Thank you for shopping at ${site.name}! ${
        paymentMethod === "cod"
          ? "Please keep cash ready for delivery."
          : "Your payment was successful."
      }</p>`;

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#FF3F6C;">${title}</h2>
      ${greeting}
      <p><strong>Order ID:</strong> ${transactionId}</p>
      <p><strong>Payment:</strong> ${payLabel}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <thead><tr style="background:#282c3f;color:#fff;">
          <th style="padding:8px;text-align:left;">Product</th>
          <th style="padding:8px;">Qty</th>
          <th style="padding:8px;text-align:right;">Amount</th>
        </tr></thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr><td colspan="2">Subtotal</td><td style="text-align:right;">₹${subtotal.toLocaleString("en-IN")}</td></tr>
          ${deliveryRow}
          <tr><td colspan="2" style="font-weight:bold;">Total</td>
          <td style="text-align:right;font-weight:bold;">₹${total.toLocaleString("en-IN")}</td></tr>
        </tfoot>
      </table>
      <p><strong>Customer:</strong> ${customer.name}<br>
         <strong>Email:</strong> ${customer.email}<br>
         <strong>Phone:</strong> ${customer.phone}<br>
         <strong>Address:</strong> ${customer.address}, ${customer.city}, ${customer.state} - ${customer.pincode}</p>
      <p style="color:#64748b;font-size:12px;">${site.legalName} | ${site.contact.address} | ${site.contact.phone}</p>
    </div>`;
}

export async function sendOrderEmails(payload: OrderEmailPayload) {
  const { site } = getSiteConfig();
  const adminEmail = process.env.ADMIN_EMAIL;
  const buyerHtml = buildOrderHtml(payload, false);
  const adminHtml = buildOrderHtml(payload, true);

  await sendViaResend(
    payload.customer.email,
    `${site.name} Order Confirmed — ${payload.transactionId}`,
    buyerHtml
  );

  if (adminEmail) {
    await sendViaResend(
      adminEmail,
      `[${site.name}] New Order — ${payload.transactionId}`,
      adminHtml
    );
  }
}
