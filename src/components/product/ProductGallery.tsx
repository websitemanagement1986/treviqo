"use client";

import Image from "next/image";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { assetUrl } from "@/lib/format";

export function ProductGallery({ product }: { product: Product }) {
  const [selected, setSelected] = useState(0);

  return (
    <div>
      <div className="relative aspect-[3/4] overflow-hidden rounded-[var(--border-radius)] bg-[var(--color-surface)] mb-4">
        <Image
          src={assetUrl(product.images[selected])}
          alt={product.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      </div>
      {product.images.length > 1 && (
        <div className="flex gap-2">
          {product.images.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`relative w-16 h-20 rounded overflow-hidden border-2 transition-colors ${
                i === selected ? "border-[var(--color-primary)]" : "border-transparent"
              }`}
            >
              <Image src={assetUrl(img)} alt="" fill className="object-cover" sizes="64px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
