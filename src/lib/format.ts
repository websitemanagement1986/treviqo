/** Bump when product/category images change to bust CDN/browser cache on Hostinger. */
const ASSET_VERSION = "5";

export function assetUrl(path: string): string {
  if (!path || path.startsWith("http")) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${ASSET_VERSION}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

export function getEffectivePrice(price: number, salePrice?: number): number {
  return salePrice ?? price;
}

export function getDiscountPercent(price: number, salePrice?: number): number | null {
  if (!salePrice || salePrice >= price) return null;
  return Math.round(((price - salePrice) / price) * 100);
}
