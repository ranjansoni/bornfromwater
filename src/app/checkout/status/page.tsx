import type { Metadata } from "next";
import Link from "next/link";
import { ClearPaidCart } from "@/components/ClearPaidCart";
import { getOrder, type StoredOrder } from "@/lib/order-store";
import { verifyOrderToken } from "@/lib/orders";
import { canDisplayPaymentCurrency, formatPaymentAmount } from "@/lib/payment-currency";
import { refreshStripeOrder } from "@/lib/stripe-checkout";

export const metadata: Metadata = { title: "Order status", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = { searchParams: Promise<{ token?: string }> };

export default async function OrderStatusPage({ searchParams }: Props) {
  const { token = "" } = await searchParams;
  let order: StoredOrder | null = null;
  let unavailable = false;
  try {
    const identity = typeof token === "string" ? verifyOrderToken(token) : null;
    order = identity ? await getOrder(identity.orderId) : null;
    if (order && (order.checkoutRequestId !== identity?.checkoutRequestId || !canDisplayPaymentCurrency(order.currency))) order = null;
    if (order) {
      await refreshStripeOrder(order);
      order = await getOrder(order.orderId);
    }
  } catch { unavailable = true; }

  if (!order) {
    return <section className="px-6 py-16 md:px-12">
      <h1 className="text-[38px] font-extrabold">{unavailable ? "Order status is temporarily unavailable." : "We could not identify this order."}</h1>
      <p className="mt-5">If you submitted payment, contact us before paying again.</p>
      <a href="mailto:bornfromwatercanada@gmail.com" className="mt-6 inline-block text-accent-700 underline">Contact us</a>
    </section>;
  }

  const approved = order.paymentStatus === "approved";
  const ended = order.paymentStatus === "declined" || order.paymentStatus === "expired";
  const historical = order.paymentProvider === "godaddy";
  const sandbox = !historical && order.stripeLivemode === false;
  return <section className="mx-auto max-w-3xl px-6 py-16 md:px-12">
    {approved && <ClearPaidCart checkoutId={order.checkoutRequestId} />}
    <p className="text-[12px] tracking-[0.16em] text-accent-700 uppercase">
      {approved ? "Payment approved" : ended ? "Checkout ended" : "Payment confirmation pending"}
    </p>
    <h1 className="mt-3 text-[42px] font-extrabold tracking-[-0.03em]">
      {approved ? "Thank you for your order." : ended ? "This checkout has ended." : "We’re checking your payment."}
    </h1>
    {sandbox && <p role="status" className="mt-4 border-2 border-accent p-4">Sandbox test order. No real payment is taken and no goods will be shipped.</p>}
    {historical && order.currency === "USD" && <p className="mt-4">Historical USD test order. No goods will be shipped.</p>}
    <p className="mt-5 text-[18px] leading-[1.6]">
      {approved
        ? `Your payment of ${formatPaymentAmount(order.paidTotalCents ?? order.totalCents, order.currency)} is confirmed.`
        : historical
          ? "This order used our previous payment service. Contact us to check it before starting another payment."
          : ended
            ? "Return to checkout to review your selection and start again."
            : "Your order is not marked paid. If you submitted payment, please wait for confirmation before trying another payment."}
    </p>
    {unavailable && <p role="alert" className="mt-4">We couldn’t refresh the payment status. The saved status is shown; please check again shortly.</p>}
    <p className="mt-3 text-[14px] text-mid">Order: {order.orderId}</p>
    <div className="mt-8 flex flex-wrap gap-6">
      {approved ? <Link href="/" className="text-accent-700 underline">Continue shopping</Link>
        : <a href={`/checkout/status?token=${encodeURIComponent(token)}`} className="text-accent-700 underline">Refresh status</a>}
      {!historical && !approved && order.paymentStatus !== "processing" &&
        <Link href="/checkout" className="text-accent-700 underline">Return to checkout</Link>}
      <a href="mailto:bornfromwatercanada@gmail.com" className="text-accent-700 underline">Contact us</a>
    </div>
  </section>;
}
