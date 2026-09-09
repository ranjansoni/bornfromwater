import { createPendingOrder } from "@/lib/order-store";
import { signOrderToken, validateCart } from "@/lib/orders";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { items?: unknown; checkoutId?: unknown };
    if (
      typeof body.checkoutId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(body.checkoutId)
    ) {
      return Response.json({ error: "Invalid checkout request." }, { status: 400 });
    }

    const cart = validateCart(body.items);
    const order = await createPendingOrder(cart.lines, cart.totalCents, body.checkoutId);
    const token = signOrderToken({
      version: 1,
      orderId: order.orderId,
      checkoutRequestId: order.checkoutRequestId,
    });

    return Response.json({ paymentPath: `/checkout/pay?token=${encodeURIComponent(token)}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout could not be started.";
    console.error("Checkout creation failed", { message });
    return Response.json({ error: message }, { status: 400 });
  }
}
