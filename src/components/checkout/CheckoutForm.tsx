"use client";

import Link from "next/link";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { generateOrderNumber } from "@/lib/format";
import type { CheckoutFormData } from "@/lib/types";
import { CartSummary } from "@/components/cart/CartSummary";

type PaymentMethod = "cod" | "gateway";

export function CheckoutForm() {
  const router = useRouter();
  const { items, clearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [form, setForm] = useState<CheckoutFormData>({
    email: "",
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    cardNumber: "",
    cardExpiry: "",
    cardCvc: "",
  });

  const update = (field: keyof CheckoutFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const orderNumber = generateOrderNumber();
    const orderData = {
      orderNumber,
      items: [...items],
      paymentMethod: "cod" as const,
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
        <section>
          <h2 className="text-lg font-bold mb-4">Contact Information</h2>
          <input
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="input-field"
            required
          />
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
              className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-[var(--border-radius)] opacity-60 cursor-not-allowed bg-gray-50"
            >
              <input
                type="radio"
                name="paymentMethod"
                value="gateway"
                disabled
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-[var(--color-accent)]">Payment Gateway</span>
                  <span className="text-[10px] font-bold uppercase bg-[var(--color-primary)] text-white px-2 py-0.5 rounded">
                    Coming Soon
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  Pay online via UPI, credit/debit card, or net banking. Available shortly.
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

        <button type="submit" className="btn-primary w-full py-3 text-base">
          Place Order (COD)
        </button>
      </div>

      <div>
        <CartSummary showCheckout={false} />
      </div>
    </form>
  );
}
