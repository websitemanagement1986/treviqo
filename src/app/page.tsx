import { getSiteConfig } from "@/lib/site-loader";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { BrandsRow } from "@/components/home/BrandsRow";
import { DealsRow } from "@/components/home/DealsRow";

export default function HomePage() {
  const config = getSiteConfig();
  const dealProducts = config.products.filter((p) => p.deal).slice(0, 10);
  const featuredProducts = config.products.filter((p) => p.featured).slice(0, 5);

  return (
    <>
      <HeroCarousel slides={config.heroSlides} />
      <BrandsRow brands={config.brands} />
      <CategoryGrid categories={config.categories} />
      <DealsRow products={dealProducts} title="Deals on Top Brands" />
      <DealsRow
        products={config.products.filter((p) => (p.salePrice ?? p.price) < 100).slice(0, 8)}
        title="Under ₹100"
      />
      {featuredProducts.length > 0 && (
        <DealsRow products={featuredProducts} title="Trending Now" />
      )}
    </>
  );
}
