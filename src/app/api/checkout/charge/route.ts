import {
  DuplicatePaymentError,
  InvalidOrderAmountError,
  processOrderPayment,
} from "@/lib/checkout-service";
import { chargeNonce } from "@/lib/godaddy";
import {
  claimOrderForPayment,
  getOrder,
  markOrderApproved,
  markOrderDeclined,
  type StoredOrder,
} from "@/lib/order-store";
import { verifyOrderToken } from "@/lib/orders";
import { products } from "@/lib/products";

export const runtime = "nodejs";

function authoritativeTotal(order: StoredOrder): number {
  const seen = new Set<string>();
  return order.validatedCart.reduce((sum, line) => {
    const product = products.find((candidate) => candidate.sku === line.sku);
    if (
      !product ||
      product.placeholder ||
      seen.has(line.sku) ||
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > 10 ||
      line.unitPriceCents !== product.priceCents
    ) {
      throw new InvalidOrderAmountError("The stored cart is invalid.");
    }
    seen.add(line.sku);
    return sum + product.priceCents * line.quantity;
  }, 0);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: unknown; nonce?: unknown };
    if (
      typeof body.token !== "string" ||
      typeof body.nonce !== "string" ||
      body.nonce.length < 8 ||
      body.nonce.length > 4096
    ) {
      return Response.json({ error: "Invalid payment request." }, { status: 400 });
    }

    const identity = verifyOrderToken(body.token);
    if (!identity) return Response.json({ error: "Invalid order." }, { status: 400 });
    const order = await getOrder(identity.orderId);
    if (!order || order.checkoutRequestId !== identity.checkoutRequestId) {
      return Response.json({ error: "Order not found." }, { status: 404 });
    }

    const result = await processOrderPayment(
      order,
      authoritativeTotal(order),
      {
        claim: claimOrderForPayment,
        approve: markOrderApproved,
        decline: markOrderDeclined,
      },
      () => chargeNonce(body.nonce as string, order),
    );

    if (result.outcome === "declined") {
      return Response.json(
        {
          status: "declined",
          confirmationPath: `/checkout/status?token=${encodeURIComponent(body.token)}`,
          error: "The payment was declined. Check the card and try again.",
        },
        { status: 402 },
      );
    }
    return Response.json({
      status: "approved",
      confirmationPath: `/checkout/status?token=${encodeURIComponent(body.token)}`,
    });
  } catch (error) {
    if (error instanceof DuplicatePaymentError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof InvalidOrderAmountError) {
      console.error("Checkout amount validation failed");
      return Response.json({ error: "The order total could not be verified." }, { status: 400 });
    }
    console.error("Payment processing failed", {
      message: error instanceof Error ? error.message : "Unknown payment error",
    });
    return Response.json(
      { error: error instanceof Error ? error.message : "Payment could not be processed." },
      { status: 503 },
    );
  }
}
