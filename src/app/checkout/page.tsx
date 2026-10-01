import type { Metadata } from "next";
import { CartView } from "@/components/CartView";
import { isLivePaymentPreview } from "@/lib/stripe-config";

export const metadata: Metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

export default function CheckoutPage() {
  return <CartView checkout livePreview={isLivePaymentPreview()} />;
}
