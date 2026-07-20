import { getSiteConfig } from "@/lib/site-loader";
import { getEffectivePrice } from "@/lib/format";

export interface CartEntry {
  id: string;
  qty: number;
  size?: string;
  color?: string;
  price?: number;
}

export interface ValidatedLineItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  lineTotal: number;
  size: string;
  color: string;
}

export interface ValidatedCart {
  items: ValidatedLineItem[];
  subtotal: number;
  deliveryCharge: number;
  total: number;
  amountPaise: number;
}

export function validateCart(cart: CartEntry[]): ValidatedCart {
  if (!Array.isArray(cart) || cart.length === 0) {
    throw new Error("Cart is empty");
  }

  const config = getSiteConfig();
  const { freeShippingThreshold, deliveryCharge } = config.site;
  const items: ValidatedLineItem[] = [];
  let subtotal = 0;

  for (const entry of cart) {
    const product = config.products.find((p) => p.id === entry.id);
    if (!product) throw new Error(`Unknown product: ${entry.id}`);

    const qty = Number(entry.qty);
    if (!qty || qty < 1 || qty > 99) {
      throw new Error(`Invalid quantity for ${product.name}`);
    }

    const price = getEffectivePrice(product.price, product.salePrice);
    if (entry.price != null && Math.abs(entry.price - price) > 0.01) {
      throw new Error(`Price mismatch for ${product.name}`);
    }

    const lineTotal = price * qty;
    items.push({
      id: product.id,
      name: product.name,
      price,
      qty,
      lineTotal,
      size: entry.size || product.sizes[0] || "—",
      color: entry.color || product.colors[0] || "—",
    });
    subtotal += lineTotal;
  }

  if (subtotal <= 0) throw new Error("Invalid order total");

  const shipping =
    subtotal >= freeShippingThreshold ? 0 : (deliveryCharge ?? 50);
  const total = subtotal + shipping;

  return {
    items,
    subtotal,
    deliveryCharge: shipping,
    total,
    amountPaise: Math.round(total * 100),
  };
}
