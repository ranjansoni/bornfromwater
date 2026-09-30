export function stripeConfiguration(env: NodeJS.ProcessEnv = process.env) {
  const secretKey = env.STRIPE_SECRET_KEY ?? "";
  if (!/^(sk|rk)_(test|live)_\S+$/.test(secretKey)) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  if (!/^whsec_\S+$/.test(env.STRIPE_WEBHOOK_SECRET ?? "")) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
  }
  const livemode = /^(sk|rk)_live_/.test(secretKey);
  const accountId = env.STRIPE_ACCOUNT_ID ?? "";
  if (!/^acct_[A-Za-z0-9]+$/.test(accountId)) {
    throw new Error("STRIPE_ACCOUNT_ID is not configured.");
  }
  if (livemode && env.STRIPE_ALLOW_LIVE !== "true") {
    throw new Error("Live checkout has not been enabled.");
  }
  if (livemode && env.VERCEL_ENV && env.VERCEL_ENV !== "production") {
    throw new Error("Live Stripe keys cannot be used in a preview or development deployment.");
  }
  const origin = new URL(env.APP_URL ?? "http://localhost:3000");
  if (origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/" ||
    (origin.protocol !== "https:" && !(origin.protocol === "http:" && origin.hostname === "localhost"))) {
    throw new Error("APP_URL must be an HTTPS origin (or http://localhost for local testing).");
  }
  if (livemode && (!env.APP_URL || origin.protocol !== "https:")) {
    throw new Error("Live checkout requires an HTTPS APP_URL.");
  }
  if (livemode && (!env.STRIPE_SHIPPING_COUNTRIES || env.STRIPE_SHIPPING_CENTS === undefined ||
    env.STRIPE_SHIPPING_CENTS === "" || !env.STRIPE_AUTOMATIC_TAX)) {
    throw new Error("Configure shipping countries, shipping cents and tax before live checkout.");
  }
  const countries = (env.STRIPE_SHIPPING_COUNTRIES || "CA").split(",").map((v) => v.trim().toUpperCase());
  const shippingValue = env.STRIPE_SHIPPING_CENTS || "0";
  const shippingCents = Number(shippingValue);
  const tax = env.STRIPE_AUTOMATIC_TAX || "false";
  if (countries.length > 50 || countries.some((v) => !/^[A-Z]{2}$/.test(v)) ||
    !/^\d+$/.test(shippingValue) || !Number.isSafeInteger(shippingCents) ||
    shippingCents < 0 || shippingCents > 100000 || !["true", "false"].includes(tax)) {
    throw new Error("Invalid Stripe shipping or tax configuration.");
  }
  return { secretKey, accountId, livemode, origin: origin.origin, countries: [...new Set(countries)],
    shippingCents, automaticTax: tax === "true" };
}
