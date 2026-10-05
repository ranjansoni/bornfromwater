import 'server-only';

/** Public delivery settings shared by the storefront and Stripe Checkout. */
export function shippingConfiguration(env: NodeJS.ProcessEnv = process.env) {
  const countries = (env.STRIPE_SHIPPING_COUNTRIES || "CA").split(",").map((v) => v.trim().toUpperCase());
  const shippingValue = env.STRIPE_SHIPPING_CENTS || "0";
  const shippingCents = Number(shippingValue);
  const tax = env.STRIPE_AUTOMATIC_TAX || "false";
  if (countries.length > 50 || countries.some((v) => !/^[A-Z]{2}$/.test(v)) ||
    !/^\d+$/.test(shippingValue) || !Number.isSafeInteger(shippingCents) ||
    shippingCents < 0 || shippingCents > 100000 || !["true", "false"].includes(tax)) {
    throw new Error("Invalid Stripe shipping or tax configuration.");
  }
  return { countries: [...new Set(countries)], shippingCents, automaticTax: tax === "true" };
}
