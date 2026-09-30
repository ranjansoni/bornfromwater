import "server-only";
import Stripe from "stripe";
import { stripeConfiguration } from "@/lib/stripe-config";

export function stripeClient() {
  const config = stripeConfiguration();
  return new Stripe(config.secretKey, { maxNetworkRetries: 2, timeout: 20000 });
}
