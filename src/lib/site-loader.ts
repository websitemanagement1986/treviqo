import fs from "fs";
import path from "path";
import type { SiteConfig } from "./types";

export function getActiveSiteId(): string {
  return process.env.SITE || "treviqo";
}

export function getSiteConfig(siteId?: string): SiteConfig {
  const id = siteId || getActiveSiteId();
  const siteDir = path.join(process.cwd(), "sites", id);

  if (!fs.existsSync(siteDir)) {
    throw new Error(
      `Site "${id}" not found at sites/${id}. Copy sites/_template to sites/${id} and customize.`
    );
  }

  const read = (filename: string) => {
    const filePath = path.join(siteDir, filename);
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  };

  return {
    siteId: id,
    site: read("site.json"),
    theme: read("theme.json"),
    navigation: read("navigation.json"),
    categories: read("categories.json"),
    products: read("products.json"),
    heroSlides: read("hero.json"),
    brands: read("brands.json"),
  };
}

export function getAllProductSlugs(siteId?: string): string[] {
  const config = getSiteConfig(siteId);
  return config.products.map((p) => p.slug);
}

export function getAllCategorySlugs(siteId?: string): string[] {
  const config = getSiteConfig(siteId);
  return config.categories.map((c) => c.slug);
}

export function getProductBySlug(slug: string, siteId?: string) {
  const config = getSiteConfig(siteId);
  return config.products.find((p) => p.slug === slug);
}

export function getCategoryBySlug(slug: string, siteId?: string) {
  const config = getSiteConfig(siteId);
  return config.categories.find((c) => c.slug === slug);
}

export function getProductsByCategory(categorySlug: string, siteId?: string) {
  const config = getSiteConfig(siteId);
  return config.products.filter((p) => p.category === categorySlug);
}

export function themeToCssVars(theme: SiteConfig["theme"]): Record<string, string> {
  return {
    "--color-primary": theme.primary,
    "--color-primary-dark": theme.primaryDark,
    "--color-accent": theme.accent,
    "--color-background": theme.background,
    "--color-surface": theme.surface,
    "--color-text": theme.text,
    "--color-text-muted": theme.textMuted,
    "--font-heading": theme.fontHeading,
    "--font-body": theme.fontBody,
    "--border-radius": theme.borderRadius,
  };
}
