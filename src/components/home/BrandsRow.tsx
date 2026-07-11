import Link from "next/link";
import type { Brand } from "@/lib/types";

export function BrandsRow({ brands }: { brands: Brand[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 border-b border-gray-100">
      <h2 className="text-lg font-bold text-[var(--color-accent)] uppercase tracking-wide mb-6">
        Top Brands
      </h2>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
        {brands.map((brand) => (
          <Link
            key={brand.name}
            href={brand.href}
            className="flex items-center justify-center h-16 sm:h-20 border border-gray-200 rounded-sm hover:border-[var(--color-primary)] hover:shadow-sm transition-all bg-white"
          >
            <span className="text-xs sm:text-sm font-bold text-[var(--color-accent)] text-center px-2">
              {brand.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
