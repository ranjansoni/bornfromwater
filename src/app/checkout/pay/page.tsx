import type { Metadata } from "next";
import Link from "next/link";
import { PoyntCardForm } from "@/components/PoyntCardForm";
import { collectConfiguration } from "@/lib/godaddy";
import { getOrder } from "@/lib/order-store";
import { verifyOrderToken } from "@/lib/orders";
import { canDisplayPaymentCurrency, formatPaymentAmount, paymentCurrency } from "@/lib/payment-currency";

export const metadata: Metadata = { title: "Secure payment" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ token?: string }> };

export default async function PaymentPage({ searchParams }: Props) {
  const { token = "" } = await searchParams;
  const identity = verifyOrderToken(token);
  const order = identity ? await getOrder(identity.orderId) : null;

  if (!identity || !order || order.checkoutRequestId !== identity.checkoutRequestId ||
      !canDisplayPaymentCurrency(order.currency)) {
    return (
      <section className="px-6 py-16 md:px-12">
        <h1 className="text-[38px] font-extrabold">This payment link is invalid.</h1>
        <Link href="/cart" className="mt-6 inline-block text-accent-700 underline">
          Return to cart
        </Link>
      </section>
    );
  }

  if (order.paymentStatus === "approved") {
    return (
      <section className="mx-auto max-w-3xl px-6 py-16 md:px-12">
        <h1 className="text-[38px] font-extrabold">This order is already paid.</h1>
        <Link
          href={`/checkout/status?token=${encodeURIComponent(token)}`}
          className="mt-6 inline-block text-accent-700 underline"
        >
          View confirmation
        </Link>
      </section>
    );
  }

  if (order.paymentStatus === "processing") {
    return (
      <section className="mx-auto max-w-3xl px-6 py-16 md:px-12">
        <h1 className="text-[38px] font-extrabold">Your payment is being confirmed.</h1>
        <p className="mt-5 leading-[1.65]">Do not submit another payment for this order.</p>
        <Link
          href={`/checkout/status?token=${encodeURIComponent(token)}`}
          className="mt-6 inline-block text-accent-700 underline"
        >
          View order status
        </Link>
      </section>
    );
  }

  let collect;
  try {
    if (order.currency !== paymentCurrency()) throw new Error("Currency changed");
    collect = collectConfiguration();
  } catch {
    return (
      <section className="mx-auto max-w-3xl px-6 py-16 md:px-12">
        <h1 className="text-[38px] font-extrabold">Secure payment is not configured yet.</h1>
        <p className="mt-5 leading-[1.65]">Your order has not been charged.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-6 py-16 md:px-12">
      <p className="text-[12px] tracking-[0.16em] text-accent-700 uppercase">Secure checkout</p>
      <h1 className="mt-3 text-[38px] font-extrabold tracking-[-0.03em] md:text-[54px]">
        Enter your card details.
      </h1>
      <div className="rule-t rule-b mt-8 flex justify-between gap-5 py-6">
        <span className="text-[13px] text-mid">Order total</span>
        <span className="text-[20px] font-extrabold">{formatPaymentAmount(order.totalCents, order.currency)}</span>
      </div>
      {order.currency === "USD" && (
        <p role="status" className="mt-4 border-2 border-accent p-4">
          Test Lab only: this test submits USD using the same numeric amount as the CAD
          catalogue, without currency conversion. Use only your Poynt test card. No goods
          will be fulfilled. The live store charges CAD.
        </p>
      )}
      <PoyntCardForm {...collect} token={token} />
      <Link href="/cart" className="mt-5 inline-block text-[12px] text-accent-700 underline">
        Cancel and return to cart
      </Link>
    </section>
  );
}
