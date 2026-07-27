"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CartItem } from "@/lib/types";
import { getEffectivePrice } from "@/lib/format";

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  /** False until localStorage has been read — do not treat empty cart as real yet. */
  hydrated: boolean;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (productId: string, size: string, color: string) => void;
  updateQuantity: (
    productId: string,
    size: string,
    color: string,
    quantity: number
  ) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "ecommerce-cart";

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Private mode / quota — ignore so the app does not crash
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  // Skip the first persist after hydrate so we never overwrite LS with [] before load settles
  const skipNextPersist = useRef(true);

  useEffect(() => {
    const loaded = loadCart();
    setItems(loaded);
    setHydrated(true);
    // #region agent log
    fetch("http://127.0.0.1:7755/ingest/7241c1e8-cdcd-423f-a0eb-d69c4f07b551", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ac4dc3" },
      body: JSON.stringify({
        sessionId: "ac4dc3",
        runId: "cart-hydrate",
        hypothesisId: "A",
        location: "CartContext.tsx:hydrate",
        message: "Cart hydrated from localStorage",
        data: { loadedCount: loaded.length, storageKey: STORAGE_KEY },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    saveCart(items);
    // #region agent log
    fetch("http://127.0.0.1:7755/ingest/7241c1e8-cdcd-423f-a0eb-d69c4f07b551", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ac4dc3" },
      body: JSON.stringify({
        sessionId: "ac4dc3",
        runId: "cart-persist",
        hypothesisId: "A",
        location: "CartContext.tsx:persist",
        message: "Cart persisted to localStorage",
        data: { itemCount: items.length },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [items, hydrated]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
      setItems((prev) => {
        const existing = prev.find(
          (i) =>
            i.productId === item.productId &&
            i.size === item.size &&
            i.color === item.color
        );
        if (existing) {
          return prev.map((i) =>
            i.productId === item.productId &&
            i.size === item.size &&
            i.color === item.color
              ? { ...i, quantity: i.quantity + (item.quantity ?? 1) }
              : i
          );
        }
        return [...prev, { ...item, quantity: item.quantity ?? 1 }];
      });
    },
    []
  );

  const removeItem = useCallback(
    (productId: string, size: string, color: string) => {
      setItems((prev) =>
        prev.filter(
          (i) =>
            !(
              i.productId === productId &&
              i.size === size &&
              i.color === color
            )
        )
      );
    },
    []
  );

  const updateQuantity = useCallback(
    (productId: string, size: string, color: string, quantity: number) => {
      if (quantity < 1) {
        removeItem(productId, size, color);
        return;
      }
      setItems((prev) =>
        prev.map((i) =>
          i.productId === productId && i.size === size && i.color === color
            ? { ...i, quantity }
            : i
        )
      );
    },
    [removeItem]
  );

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + getEffectivePrice(i.price) * i.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      itemCount,
      subtotal,
      hydrated,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    }),
    [items, itemCount, subtotal, hydrated, addItem, removeItem, updateQuantity, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
