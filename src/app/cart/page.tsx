import type { Metadata } from "next";
import { CartView } from "@/components/CartView";
import { shippingConfiguration } from "@/lib/shipping-config";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return <CartView shipping={shippingConfiguration()} />;
}
