"use client";

import Link from "next/link";
import { useSite } from "@/context/SiteContext";
import { useCart } from "@/context/CartContext";
import { formatCurrency } from "@/lib/format";

export function CartSummary({ showCheckout = true }: { showCheckout?: boolean }) {
  const { site } = useSite();
  const { subtotal, itemCount } = useCart();
  const shipping = subtotal >= site.freeShippingThreshold ? 0 : (site.deliveryCharge ?? 50);
  const total = subtotal + shipping;

  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--border-radius)] p-6">
      <h2 className="text-lg font-bold mb-4">Order Summary</h2>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Subtotal ({itemCount} items)</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Estimated Shipping</span>
          <span>{shipping === 0 ? "FREE" : formatCurrency(shipping)}</span>
        </div>
        {subtotal < site.freeShippingThreshold && subtotal > 0 && (
          <p className="text-xs text-[var(--color-primary)]">
            Add {formatCurrency(site.freeShippingThreshold - subtotal)} more for free shipping!
          </p>
        )}
        <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between font-bold text-base">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
      {showCheckout && itemCount > 0 && (
        <Link href="/checkout" className="btn-primary w-full mt-6 text-center block">
          Proceed to Checkout
        </Link>
      )}
    </div>
  );
}
