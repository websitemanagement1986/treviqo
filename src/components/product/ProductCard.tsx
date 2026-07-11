import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { assetUrl, formatCurrency, getDiscountPercent } from "@/lib/format";
import { StarRating } from "@/components/product/StarRating";

export function ProductCard({ product }: { product: Product }) {
  const price = product.salePrice ?? product.price;
  const discount = getDiscountPercent(product.price, product.salePrice);

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-[var(--color-surface)] mb-2">
        <Image
          src={assetUrl(product.images[0])}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 50vw, 20vw"
        />
        {discount && (
          <span className="absolute bottom-2 left-2 bg-[var(--color-accent)] text-white text-[10px] font-bold px-1.5 py-0.5">
            {discount}% OFF
          </span>
        )}
      </div>
      <p className="text-sm font-bold text-[var(--color-accent)] truncate">{product.brand}</p>
      <h3 className="text-sm text-[var(--color-text-muted)] line-clamp-1 group-hover:text-[var(--color-primary)]">
        {product.name}
      </h3>
      <StarRating rating={product.rating} count={product.reviewCount} />
      <div className="mt-1 flex items-center gap-2 flex-wrap">
        <span className="font-bold text-sm text-[var(--color-accent)]">{formatCurrency(price)}</span>
        {product.salePrice && (
          <>
            <span className="text-xs text-[var(--color-text-muted)] line-through">
              {formatCurrency(product.price)}
            </span>
            {discount && (
              <span className="text-xs font-semibold text-[var(--color-primary)]">
                ({discount}% OFF)
              </span>
            )}
          </>
        )}
      </div>
    </Link>
  );
}
