import Image from "next/image";
import Link from "next/link";
import type { Category } from "@/lib/types";

export function CategoryGrid({ categories }: { categories: Category[] }) {
  const featured = categories.filter((c) => c.featured);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">Shop by Category</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {featured.map((cat) => (
          <Link
            key={cat.slug}
            href={`/category/${cat.slug}`}
            className="group relative aspect-[3/4] overflow-hidden rounded-[var(--border-radius)]"
          >
            <Image
              src={cat.image}
              alt={cat.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 50vw, 20vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="text-white font-semibold text-sm sm:text-base">{cat.name}</h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
