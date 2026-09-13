export type PaymentCurrency = "CAD" | "USD";

// Temporary Test Lab experiment. Production always uses CAD, even if the flag is set.
export function paymentCurrency(
  environment = process.env.VERCEL_ENV,
  usdTest = process.env.POYNT_PREVIEW_USD_TEST,
): PaymentCurrency {
  return environment === "preview" && usdTest === "true" ? "USD" : "CAD";
}

export function formatPaymentAmount(cents: number, currency: PaymentCurrency): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency", currency, currencyDisplay: "code",
  }).format(cents / 100);
}

export function canDisplayPaymentCurrency(
  currency: PaymentCurrency,
  environment = process.env.VERCEL_ENV,
): boolean {
  return currency === "CAD" || environment === "preview";
}
