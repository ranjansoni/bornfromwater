import "server-only";
import { createPendingOrder, getOrderByCheckoutRequest } from "@/lib/order-store";
import { isUuid, signingSecret, validateCart } from "@/lib/orders";
import { CheckoutExpiredError, checkoutDestination, statusPath } from "@/lib/stripe-checkout";
import { stripeConfiguration } from "@/lib/stripe-config";
import { catalog } from './catalog-store';
import { trackCartCheckout } from '@/lib/cart-activity-handler';
import { purchaseEligibility } from './purchase-location';

const defaults = { purchaseEligibility, getCatalog: catalog.list, createPendingOrder, getOrderByCheckoutRequest, checkoutDestination, stripeConfiguration, signingSecret, trackCartCheckout };
const json = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function handleCheckout(request: Request, deps = defaults) {
  const eligibility = deps.purchaseEligibility(request.headers);
  if (!eligibility.allowed) return json({ error: eligibility.message, code: 'CANADA_ONLY' }, 403);
  let body;
  try {
    body = await request.json();
    if (!body || !isUuid(body.checkoutId)) throw new Error();
  } catch {
    return json({ error: "Invalid checkout request." }, 400);
  }
  try {
    // Keep the original attempt even after a catalogue update or a lost response.
    // Its unguessable UUID is the retry identity; it cannot mutate the saved cart.
    let order = await deps.getOrderByCheckoutRequest(body.checkoutId);
    if (order?.paymentProvider === "godaddy") return json({ paymentPath: statusPath(order) });
    const config = deps.stripeConfiguration();
    deps.signingSecret();
    if (!order) {
      let cart;
      const products = await deps.getCatalog();
      try { cart = validateCart(body.items, products); }
      catch { return json({ error: "Please check your cart. An item or quantity is unavailable.", code: "CATALOG_CHANGED" }, 400); }
      if (body.expectedPrices && cart.lines.some(({ product }) => body.expectedPrices[product.slug] !== product.priceCents)) {
        return json({ error: "A price changed. Please review your updated cart before continuing.", code: "CATALOG_CHANGED" }, 409);
      }
      order = await deps.createPendingOrder(cart.lines, cart.totalCents, body.checkoutId, config.livemode, config.accountId);
    }
    // A concurrent legacy request can win the unique checkout_request_id insert.
    if (order.paymentProvider === "godaddy") return json({ paymentPath: statusPath(order) });
    const paymentPath = await deps.checkoutDestination(order);
    // Cart reporting is best-effort; it cannot change the order or prevent payment.
    try { if (deps.trackCartCheckout) await deps.trackCartCheckout(request, body.cartTracking, order); }
    catch { /* The checkout remains valid if observation storage is unavailable. */ }
    return json({ paymentPath });
  } catch (error) {
    if (error instanceof CheckoutExpiredError) {
      return json({ error: "This checkout has ended. You can start a new checkout.", code: "CHECKOUT_ENDED", checkoutId: body.checkoutId }, 409);
    }
    console.error("Checkout creation unavailable", { checkoutId: body.checkoutId });
    return json({ error: "We couldn’t open checkout. Please retry this checkout. If you already submitted payment, contact us before paying again." }, 503);
  }
}
