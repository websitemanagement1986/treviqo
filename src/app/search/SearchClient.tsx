"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useSite } from "@/context/SiteContext";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ProductGrid } from "@/components/product/CategoryFilters";

export default function SearchClient() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const { products } = useSite();

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [query, products]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: `Search: "${query}"` }]} />
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">
        {results.length > 0 ? `Results for "${query}"` : `No results for "${query}"`}
      </h1>
      <p className="text-[var(--color-text-muted)] mb-8">{results.length} products found</p>
      <ProductGrid products={results} />
    </div>
  );
}
