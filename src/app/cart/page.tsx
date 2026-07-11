"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { CartLineItem } from "@/components/cart/CartLineItem";
import { CartSummary } from "@/components/cart/CartSummary";
import { Breadcrumb } from "@/components/layout/Breadcrumb";

export default function CartPage() {
  const { items } = useCart();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Shopping Bag" }]} />
      <h1 className="text-2xl sm:text-3xl font-bold mb-8">Shopping Bag ({items.length})</h1>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-lg text-[var(--color-text-muted)] mb-6">Your bag is empty.</p>
          <Link href="/" className="btn-primary">Continue Shopping</Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {items.map((item) => (
              <CartLineItem
                key={`${item.productId}-${item.size}-${item.color}`}
                item={item}
              />
            ))}
            <Link href="/" className="inline-block mt-4 text-sm text-[var(--color-primary)] hover:underline">
              Continue Shopping
            </Link>
          </div>
          <div>
            <CartSummary />
          </div>
        </div>
      )}
    </div>
  );
}
