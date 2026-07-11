"use client";

import Image from "next/image";
import Link from "next/link";
import type { CartItem } from "@/lib/types";
import { useCart } from "@/context/CartContext";
import { formatCurrency, assetUrl } from "@/lib/format";
import { IconMinus, IconPlus, IconX } from "@/components/icons";

export function CartLineItem({ item }: { item: CartItem }) {
  const { updateQuantity, removeItem } = useCart();

  return (
    <div className="flex gap-4 py-4 border-b border-gray-200">
      <Link href={`/product/${item.slug}`} className="relative w-24 h-32 flex-shrink-0 rounded overflow-hidden bg-[var(--color-surface)]">
        <Image src={assetUrl(item.image)} alt={item.name} fill className="object-cover" sizes="96px" />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between gap-2">
          <div>
            <Link href={`/product/${item.slug}`} className="font-medium text-sm hover:text-[var(--color-primary)] line-clamp-2">
              {item.name}
            </Link>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              {item.color} | Size: {item.size}
            </p>
          </div>
          <button
            onClick={() => removeItem(item.productId, item.size, item.color)}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] flex-shrink-0"
            aria-label="Remove item"
          >
            <IconX />
          </button>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="inline-flex items-center border border-gray-300 rounded-[var(--border-radius)]">
            <button
              onClick={() => updateQuantity(item.productId, item.size, item.color, item.quantity - 1)}
              className="p-1.5 hover:bg-[var(--color-surface)]"
              aria-label="Decrease"
            >
              <IconMinus className="w-3 h-3" />
            </button>
            <span className="px-3 text-sm min-w-[2rem] text-center">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(item.productId, item.size, item.color, item.quantity + 1)}
              className="p-1.5 hover:bg-[var(--color-surface)]"
              aria-label="Increase"
            >
              <IconPlus className="w-3 h-3" />
            </button>
          </div>
          <span className="font-semibold text-sm">{formatCurrency(item.price * item.quantity)}</span>
        </div>
      </div>
    </div>
  );
}
