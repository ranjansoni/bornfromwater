import 'server-only';

/** Public delivery settings shared by the storefront and Stripe Checkout. */
export function shippingConfiguration(env: NodeJS.ProcessEnv = process.env) {
  const countries = (env.STRIPE_SHIPPING_COUNTRIES || "CA").split(",").map((v) => v.trim().toUpperCase());
  const shippingValue = env.STRIPE_SHIPPING_CENTS || "1000";
  const shippingCents = Number(shippingValue);
  const tax = env.STRIPE_AUTOMATIC_TAX || "false";
  const offer = env.FREE_SHIPPING_OFFER_ENABLED ?? "true";
  if (countries.length > 50 || countries.some((v) => !/^[A-Z]{2}$/.test(v)) ||
    !/^\d+$/.test(shippingValue) || !Number.isSafeInteger(shippingCents) ||
    shippingCents < 0 || shippingCents > 100000 || !["true", "false"].includes(tax) ||
    !["true", "false"].includes(offer)) {
    throw new Error("Invalid Stripe shipping or tax configuration.");
  }
  const allowedCountries = [...new Set(countries)];
  const complimentaryShipping = offer === "true" && allowedCountries.length === 1 && allowedCountries[0] === "CA";
  return { countries: allowedCountries, shippingCents: complimentaryShipping ? 0 : shippingCents,
    complimentaryShipping, automaticTax: tax === "true" };
}
