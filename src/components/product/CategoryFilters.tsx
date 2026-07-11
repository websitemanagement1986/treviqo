"use client";

import { useState, useMemo, useEffect } from "react";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/product/ProductCard";

type SortOption = "price-asc" | "price-desc" | "rating" | "newest";

export function CategoryFilters({
  products,
  onFilter,
}: {
  products: Product[];
  onFilter: (filtered: Product[]) => void;
}) {
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOption>("newest");

  const allSizes = useMemo(() => [...new Set(products.flatMap((p) => p.sizes))].sort(), [products]);
  const allColors = useMemo(() => [...new Set(products.flatMap((p) => p.colors))].sort(), [products]);

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const toggleColor = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  };

  const filtered = useMemo(() => {
    let result = [...products];

    if (priceMin) result = result.filter((p) => (p.salePrice ?? p.price) >= Number(priceMin));
    if (priceMax) result = result.filter((p) => (p.salePrice ?? p.price) <= Number(priceMax));
    if (selectedSizes.length) result = result.filter((p) => p.sizes.some((s) => selectedSizes.includes(s)));
    if (selectedColors.length) result = result.filter((p) => p.colors.some((c) => selectedColors.includes(c)));

    switch (sort) {
      case "price-asc":
        result.sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price));
        break;
      case "price-desc":
        result.sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price));
        break;
      case "rating":
        result.sort((a, b) => b.rating - a.rating);
        break;
      case "newest":
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return result;
  }, [products, priceMin, priceMax, selectedSizes, selectedColors, sort]);

  useEffect(() => { onFilter(filtered); }, [filtered, onFilter]);

  return (
    <aside className="space-y-6">
      <div>
        <h3 className="font-semibold text-sm mb-3">Sort By</h3>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="input-field"
        >
          <option value="newest">Newest</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="rating">Top Rated</option>
        </select>
      </div>

      <div>
        <h3 className="font-semibold text-sm mb-3">Price Range</h3>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            className="input-field"
          />
          <input
            type="number"
            placeholder="Max"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      {allSizes.length > 1 && (
        <div>
          <h3 className="font-semibold text-sm mb-3">Size</h3>
          <div className="flex flex-wrap gap-2">
            {allSizes.map((size) => (
              <button
                key={size}
                onClick={() => toggleSize(size)}
                className={`px-2 py-1 text-xs border rounded-[var(--border-radius)] ${
                  selectedSizes.includes(size)
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                    : "border-gray-300"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {allColors.length > 1 && (
        <div>
          <h3 className="font-semibold text-sm mb-3">Color</h3>
          <div className="flex flex-wrap gap-2">
            {allColors.map((color) => (
              <button
                key={color}
                onClick={() => toggleColor(color)}
                className={`px-2 py-1 text-xs border rounded-[var(--border-radius)] ${
                  selectedColors.includes(color)
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                    : "border-gray-300"
                }`}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return <p className="text-center py-12 text-[var(--color-text-muted)]">No products match your filters.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
