export type PayableOrder = {
  orderId: string;
  totalCents: number;
  currency: "CAD" | "USD";
  paymentStatus: "pending" | "processing" | "approved" | "declined";
  godaddyTransactionId: string | null;
};

export type GatewayResult =
  | { outcome: "approved"; transactionId: string; totalCents: number; currency: string }
  | { outcome: "declined" };

export type PaymentStore = {
  claim(orderId: string): Promise<boolean>;
  approve(orderId: string, transactionId: string): Promise<void>;
  decline(orderId: string): Promise<void>;
};

export class DuplicatePaymentError extends Error {}
export class InvalidOrderAmountError extends Error {}

export async function processOrderPayment(
  order: PayableOrder,
  authoritativeTotalCents: number,
  store: PaymentStore,
  charge: () => Promise<GatewayResult>,
  expectedCurrency: "CAD" | "USD" = "CAD",
): Promise<GatewayResult> {
  if (
    order.currency !== expectedCurrency ||
    !Number.isSafeInteger(authoritativeTotalCents) ||
    authoritativeTotalCents < 100 ||
    order.totalCents !== authoritativeTotalCents
  ) {
    throw new InvalidOrderAmountError("The stored order amount is invalid.");
  }

  if (order.paymentStatus === "approved" && order.godaddyTransactionId) {
    return {
      outcome: "approved",
      transactionId: order.godaddyTransactionId,
      totalCents: order.totalCents,
      currency: order.currency,
    };
  }

  if (!(await store.claim(order.orderId))) {
    throw new DuplicatePaymentError("This order is already being processed.");
  }

  const result = await charge();
  if (result.outcome === "declined") {
    await store.decline(order.orderId);
    return result;
  }

  if (
    result.currency !== expectedCurrency ||
    result.totalCents !== authoritativeTotalCents ||
    !result.transactionId
  ) {
    throw new InvalidOrderAmountError("GoDaddy returned an unexpected payment amount.");
  }

  await store.approve(order.orderId, result.transactionId);
  return result;
}
