import type { Metadata } from "next";
import { CartView } from "@/components/CartView";
import { shippingConfiguration } from "@/lib/shipping-config";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return <CartView checkout shipping={shippingConfiguration()} />;
}
