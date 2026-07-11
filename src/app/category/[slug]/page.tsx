import { notFound } from "next/navigation";
import {
  getSiteConfig,
  getCategoryBySlug,
  getProductsByCategory,
  getAllCategorySlugs,
} from "@/lib/site-loader";
import { CategoryPageClient } from "@/components/product/CategoryPageClient";

export function generateStaticParams() {
  return getAllCategorySlugs().map((slug) => ({ slug }));
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) notFound();

  const products =
    slug === "sale"
      ? getSiteConfig().products.filter((p) => p.deal || p.category === "sale")
      : getProductsByCategory(slug);

  return (
    <CategoryPageClient categoryName={category.name} products={products} />
  );
}
