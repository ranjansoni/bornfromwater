"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getProduct, type Product } from "@/lib/products";

const STORAGE_KEY = "born-from-water-cart-v1";
const MAX_QUANTITY = 10;

export type CartItem = { slug: string; quantity: number };
export type CartLine = CartItem & { product: Product };

type CartContextValue = {
  items: CartItem[];
  lines: CartLine[];
  itemCount: number;
  totalCents: number;
  ready: boolean;
  addItem: (slug: string) => void;
  setQuantity: (slug: string, quantity: number) => void;
  removeItem: (slug: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function sanitizeItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (
      typeof item !== "object" ||
      item === null ||
      !("slug" in item) ||
      !("quantity" in item) ||
      typeof item.slug !== "string" ||
      typeof item.quantity !== "number" ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > MAX_QUANTITY ||
      !getProduct(item.slug)
    ) {
      return [];
    }

    return [{ slug: item.slug, quantity: item.quantity }];
  });
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setItems(sanitizeItems(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")));
      } catch {
        setItems([]);
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const addItem = useCallback((slug: string) => {
    if (!getProduct(slug)) return;
    setItems((current) => {
      const existing = current.find((item) => item.slug === slug);
      if (!existing) return [...current, { slug, quantity: 1 }];
      return current.map((item) =>
        item.slug === slug
          ? { ...item, quantity: Math.min(MAX_QUANTITY, item.quantity + 1) }
          : item,
      );
    });
  }, []);

  const setQuantity = useCallback((slug: string, quantity: number) => {
    if (!Number.isInteger(quantity)) return;
    if (quantity < 1) {
      setItems((current) => current.filter((item) => item.slug !== slug));
      return;
    }
    setItems((current) =>
      current.map((item) =>
        item.slug === slug
          ? { ...item, quantity: Math.min(MAX_QUANTITY, quantity) }
          : item,
      ),
    );
  }, []);

  const removeItem = useCallback((slug: string) => {
    setItems((current) => current.filter((item) => item.slug !== slug));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const lines = items.flatMap((item) => {
      const product = getProduct(item.slug);
      return product ? [{ ...item, product }] : [];
    });

    return {
      items,
      lines,
      itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
      totalCents: lines.reduce(
        (sum, line) => sum + line.product.priceCents * line.quantity,
        0,
      ),
      ready,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
    };
  }, [items, ready, addItem, setQuantity, removeItem, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
