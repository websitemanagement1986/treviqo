"use client";

import { useState, useCallback } from "react";
import type { Product } from "@/lib/types";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { CategoryFilters, ProductGrid } from "@/components/product/CategoryFilters";

export function CategoryPageClient({
  categoryName,
  products,
}: {
  categoryName: string;
  products: Product[];
}) {
  const [filtered, setFiltered] = useState(products);
  const onFilter = useCallback((result: Product[]) => setFiltered(result), []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: categoryName }]} />
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">{categoryName}</h1>
      <p className="text-[var(--color-text-muted)] mb-8">{filtered.length} products</p>

      <div className="grid lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <CategoryFilters products={products} onFilter={onFilter} />
        </div>
        <div className="lg:col-span-3">
          <ProductGrid products={filtered} />
        </div>
      </div>
    </div>
  );
}
