"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { generateOrderNumber } from "@/lib/format";
import type { CheckoutFormData } from "@/lib/types";
import { CartSummary } from "@/components/cart/CartSummary";

export function CheckoutForm() {
  const router = useRouter();
  const { items, clearCart } = useCart();
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
      form: { ...form, cardNumber: "****", cardCvc: "***" },
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
        <a href="/" className="btn-primary">Continue Shopping</a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        {/* Contact */}
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

        {/* Shipping */}
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
              placeholder="ZIP code"
              value={form.zip}
              onChange={(e) => update("zip", e.target.value)}
              className="input-field"
              required
            />
          </div>
        </section>

        {/* Payment - mock */}
        <section>
          <h2 className="text-lg font-bold mb-4">Payment</h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">
            This is a demo checkout. No real payment will be processed.
          </p>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Card number"
              value={form.cardNumber}
              onChange={(e) => update("cardNumber", e.target.value)}
              className="input-field"
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="MM/YY"
                value={form.cardExpiry}
                onChange={(e) => update("cardExpiry", e.target.value)}
                className="input-field"
                required
              />
              <input
                type="text"
                placeholder="CVC"
                value={form.cardCvc}
                onChange={(e) => update("cardCvc", e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>
        </section>

        <button type="submit" className="btn-primary w-full py-3 text-base">
          Place Order
        </button>
      </div>

      <div>
        <CartSummary showCheckout={false} />
      </div>
    </form>
  );
}
