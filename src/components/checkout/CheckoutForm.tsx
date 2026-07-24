"use client";

import Link from "next/link";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { generateOrderNumber } from "@/lib/format";
import type { CheckoutFormData } from "@/lib/types";
import { CartSummary } from "@/components/cart/CartSummary";

type PaymentMethod = "cod" | "gateway";

const PENDING_KEY = "treviqo_paymate_pending";

function validateForm(form: CheckoutFormData, hasItems: boolean): string[] {
  const errors: string[] = [];
  if (!form.firstName.trim() || !form.lastName.trim()) errors.push("Full name is required");
  if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.push("Valid email is required");
  }
  const phone = form.phone.replace(/\D/g, "").slice(-10);
  if (!/^[6-9]\d{9}$/.test(phone)) errors.push("Valid 10-digit Indian mobile number is required");
  if (!form.address.trim()) errors.push("Address is required");
  if (!form.city.trim()) errors.push("City is required");
  if (!form.state.trim()) errors.push("State is required");
  if (!/^\d{6}$/.test(form.zip.trim())) errors.push("Valid 6-digit PIN code is required");
  if (!hasItems) errors.push("Your bag is empty");
  return errors;
}

export function CheckoutForm() {
  const router = useRouter();
  const { items, clearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CheckoutFormData>({
    email: "",
    phone: "",
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });

  const update = (field: keyof CheckoutFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const buildCustomer = () => ({
    name: `${form.firstName.trim()} ${form.lastName.trim()}`,
    email: form.email.trim(),
    phone: form.phone.replace(/\D/g, "").slice(-10),
    address: form.address.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    pincode: form.zip.trim(),
  });

  const buildCartPayload = () =>
    items.map((item) => ({
      id: item.productId,
      qty: item.quantity,
      size: item.size,
      color: item.color,
      price: item.price,
    }));

  const saveOrderAndRedirect = (orderNumber: string, transactionId: string, method: PaymentMethod) => {
    const orderData = {
      orderNumber,
      transactionId,
      items: [...items],
      paymentMethod: method,
      form: {
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        address: form.address,
        city: form.city,
        state: form.state,
        zip: form.zip,
      },
      date: new Date().toISOString(),
    };
    sessionStorage.setItem("lastOrder", JSON.stringify(orderData));
    clearCart();
    router.push(`/order-confirmation?order=${orderNumber}`);
  };

  const placeCodOrder = async () => {
    const customer = buildCustomer();
    const res = await fetch("/api/place-cod-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cart: buildCartPayload(), customer }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Failed to place COD order");
    saveOrderAndRedirect(generateOrderNumber(), result.transaction_id, "cod");
  };

  const initiatePaymatePayment = async () => {
    const customer = buildCustomer();
    const cart = buildCartPayload();
    const orderNumber = generateOrderNumber();

    const res = await fetch("/api/paymate/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cart, customer, payment_method: "upi" }),
    });
    const result = await res.json();
    if (!res.ok) {
      const detail =
        result.details?.DetailedSummary?.[0]?.StatusMessage ||
        result.details?.Description ||
        result.error;
      throw new Error(detail || "Failed to create payment order");
    }

    if (!result.payment_url) {
      throw new Error("PayMate did not return a payment URL. Please try again or contact support.");
    }

    sessionStorage.setItem(
      PENDING_KEY,
      JSON.stringify({
        orderId: result.order_id,
        orderNumber,
        amount: result.amount,
        customer,
        items: [...items],
        paymentMethod: "upi",
        form: {
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          address: form.address,
          city: form.city,
          state: form.state,
          zip: form.zip,
        },
      })
    );

    window.location.href = result.payment_url;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationErrors = validateForm(form, items.length > 0);
    if (validationErrors.length) {
      setErrors(validationErrors);
      return;
    }
    setErrors([]);
    setSubmitting(true);

    try {
      if (paymentMethod === "cod") {
        await placeCodOrder();
      } else {
        await initiatePaymatePayment();
      }
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Checkout failed"]);
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg mb-4">Your bag is empty.</p>
        <Link href="/" className="btn-primary">Continue Shopping</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-[var(--border-radius)] p-4 text-sm text-red-800">
            {errors.map((err) => (
              <p key={err}>{err}</p>
            ))}
          </div>
        )}

        <section>
          <h2 className="text-lg font-bold mb-4">Contact Information</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <input
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="input-field sm:col-span-2"
              required
            />
            <input
              type="tel"
              placeholder="Mobile number"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="input-field sm:col-span-2"
              required
            />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-4">Shipping Address</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="First name"
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              className="input-field"
              required
            />
            <input
              type="text"
              placeholder="Last name"
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              className="input-field"
              required
            />
            <input
              type="text"
              placeholder="Address"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              className="input-field sm:col-span-2"
              required
            />
            <input
              type="text"
              placeholder="City"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              className="input-field"
              required
            />
            <input
              type="text"
              placeholder="State"
              value={form.state}
              onChange={(e) => update("state", e.target.value)}
              className="input-field"
              required
            />
            <input
              type="text"
              placeholder="PIN code"
              value={form.zip}
              onChange={(e) => update("zip", e.target.value)}
              className="input-field"
              required
            />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-4">Payment Method</h2>
          <div className="space-y-3">
            <label
              className={`flex items-start gap-3 p-4 border-2 rounded-[var(--border-radius)] cursor-pointer transition-colors ${
                paymentMethod === "cod"
                  ? "border-[var(--color-primary)] bg-[var(--color-surface)]"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="cod"
                checked={paymentMethod === "cod"}
                onChange={() => setPaymentMethod("cod")}
                className="mt-1 accent-[var(--color-primary)]"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--color-accent)]">Cash on Delivery (COD)</span>
                  <span className="text-[10px] font-bold uppercase bg-green-100 text-green-700 px-2 py-0.5 rounded">
                    Available
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  Pay with cash when your order is delivered to your doorstep.
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-4 border-2 rounded-[var(--border-radius)] cursor-pointer transition-colors ${
                paymentMethod === "gateway"
                  ? "border-[var(--color-primary)] bg-[var(--color-surface)]"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="gateway"
                checked={paymentMethod === "gateway"}
                onChange={() => setPaymentMethod("gateway")}
                className="mt-1 accent-[var(--color-primary)]"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-[var(--color-accent)]">Pay Online (PayMate UPI)</span>
                  <span className="text-[10px] font-bold uppercase bg-[var(--color-primary)] text-white px-2 py-0.5 rounded">
                    UPI
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  Secure online payment via PayMate hosted checkout.
                </p>
              </div>
            </label>
          </div>
        </section>

        {paymentMethod === "cod" && (
          <div className="bg-green-50 border border-green-200 rounded-[var(--border-radius)] p-4 text-sm text-green-800">
            You have selected <strong>Cash on Delivery</strong>. Please keep the exact amount ready at the time of delivery.
          </div>
        )}

        {paymentMethod === "gateway" && (
          <div className="bg-pink-50 border border-pink-200 rounded-[var(--border-radius)] p-4 text-sm text-pink-900">
            You will be redirected to PayMate to complete UPI payment securely.
          </div>
        )}

        <button
          type="submit"
          className="btn-primary w-full py-3 text-base disabled:opacity-60"
          disabled={submitting}
        >
          {submitting
            ? "Processing..."
            : paymentMethod === "cod"
              ? "Place Order (COD)"
              : "Pay Now"}
        </button>
      </div>

      <div>
        <CartSummary showCheckout={false} />
      </div>
    </form>
  );
}
