import type { Metadata } from "next";
import { CartView } from "@/components/CartView";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return <CartView checkout />;
}
