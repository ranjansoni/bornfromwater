// USD is retained only for reading historical GoDaddy test orders.
export type PaymentCurrency = "CAD" | "USD";

export function paymentCurrency(): PaymentCurrency { return "CAD"; }

export function formatPaymentAmount(cents: number, currency: PaymentCurrency): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency", currency, currencyDisplay: "code",
  }).format(cents / 100);
}

export function canDisplayPaymentCurrency(currency: PaymentCurrency): boolean {
  return currency === "CAD" || currency === "USD";
}
