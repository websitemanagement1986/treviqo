"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { useCart } from "@/context/CartContext";
import { formatCurrency, getDiscountPercent, getEffectivePrice, assetUrl } from "@/lib/format";
import { StarRating } from "@/components/product/StarRating";
import { IconMinus, IconPlus } from "@/components/icons";

export function AddToCartSection({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState(product.sizes[0]);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const price = getEffectivePrice(product.price, product.salePrice);
  const discount = getDiscountPercent(product.price, product.salePrice);

  const handleAdd = () => {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: assetUrl(product.images[0]),
      price,
      size: selectedSize,
      color: selectedColor,
      quantity,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-1">{product.name}</h1>
      <p className="text-base font-bold text-[var(--color-text-muted)] mb-2">{product.brand}</p>
      <StarRating rating={product.rating} count={product.reviewCount} />

      <div className="mt-4 flex items-center gap-3">
        <span className="text-2xl font-bold">{formatCurrency(price)}</span>
        {product.salePrice && (
          <>
            <span className="text-lg text-[var(--color-text-muted)] line-through">
              {formatCurrency(product.price)}
            </span>
            {discount && (
              <span className="text-sm font-semibold text-[var(--color-primary)]">
                Save {discount}%
              </span>
            )}
          </>
        )}
      </div>

      {product.colors.length > 1 && (
        <div className="mt-6">
          <label className="text-sm font-semibold block mb-2">Color: {selectedColor}</label>
          <div className="flex flex-wrap gap-2">
            {product.colors.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`px-3 py-1.5 text-sm border rounded-[var(--border-radius)] transition-colors ${
                  selectedColor === color
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                    : "border-gray-300 hover:border-[var(--color-primary)]"
                }`}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      )}

      {product.sizes.length > 1 && (
        <div className="mt-4">
          <label className="text-sm font-semibold block mb-2">Size: {selectedSize}</label>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((size) => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`min-w-[3rem] px-3 py-1.5 text-sm border rounded-[var(--border-radius)] transition-colors ${
                  selectedSize === size
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                    : "border-gray-300 hover:border-[var(--color-primary)]"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <label className="text-sm font-semibold block mb-2">Quantity</label>
        <div className="inline-flex items-center border border-gray-300 rounded-[var(--border-radius)]">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="p-2 hover:bg-[var(--color-surface)]"
            aria-label="Decrease quantity"
          >
            <IconMinus />
          </button>
          <span className="px-4 py-2 text-sm font-medium min-w-[3rem] text-center">{quantity}</span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="p-2 hover:bg-[var(--color-surface)]"
            aria-label="Increase quantity"
          >
            <IconPlus />
          </button>
        </div>
      </div>

      <button
        onClick={handleAdd}
        className="btn-primary w-full mt-6 py-3 text-base"
      >
        {added ? "Added to Bag!" : "Add to Bag"}
      </button>
    </div>
  );
}
