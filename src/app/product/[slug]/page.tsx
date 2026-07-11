import { notFound } from "next/navigation";
import { getProductBySlug, getAllProductSlugs } from "@/lib/site-loader";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ProductGallery } from "@/components/product/ProductGallery";
import { AddToCartSection } from "@/components/product/AddToCartSection";
import { ProductAccordion } from "@/components/product/ProductAccordion";

export function generateStaticParams() {
  return getAllProductSlugs().map((slug) => ({ slug }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) notFound();

  const categoryName = product.category.charAt(0).toUpperCase() + product.category.slice(1);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: categoryName, href: `/category/${product.category}` },
          { label: product.name },
        ]}
      />
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        <ProductGallery product={product} />
        <div>
          <AddToCartSection product={product} />
          <ProductAccordion
            description={product.description}
            shipping={product.shipping}
            returns={product.returns}
          />
        </div>
      </div>
    </div>
  );
}
