import type { Metadata } from "next";
import Link from "next/link";
import { ClearPaidCart } from "@/components/ClearPaidCart";
import { getOrder } from "@/lib/order-store";
import { verifyOrderToken } from "@/lib/orders";
import { formatCad } from "@/lib/products";

export const metadata: Metadata = { title: "Order status" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ token?: string }> };

export default async function OrderStatusPage({ searchParams }: Props) {
  const { token = "" } = await searchParams;
  const identity = verifyOrderToken(token);
  const order = identity ? await getOrder(identity.orderId) : null;

  if (!identity || !order || order.checkoutRequestId !== identity.checkoutRequestId) {
    return (
      <section className="px-6 py-16 md:px-12">
        <h1 className="text-[38px] font-extrabold">We could not identify this order.</h1>
        <Link href="/cart" className="mt-6 inline-block text-accent-700 underline">
          Return to cart
        </Link>
      </section>
    );
  }

  if (order.paymentStatus === "approved") {
    return (
      <section className="mx-auto max-w-3xl px-6 py-16 md:px-12">
        <ClearPaidCart />
        <p className="text-[12px] tracking-[0.16em] text-accent-700 uppercase">Payment approved</p>
        <h1 className="mt-3 text-[42px] font-extrabold tracking-[-0.03em]">
          Thank you for your order.
        </h1>
        <p className="mt-5 text-[18px] leading-[1.6]">
          GoDaddy confirmed your payment of {formatCad(order.totalCents)} CAD.
        </p>
        <p className="mt-3 text-[14px] text-mid">Order: {order.orderId}</p>
        <Link
          href="/"
          className="mt-8 inline-flex bg-accent px-5 py-3 text-[13px] font-extrabold tracking-[0.1em] text-sand uppercase"
        >
          Continue shopping
        </Link>
      </section>
    );
  }

  const declined = order.paymentStatus === "declined";
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 md:px-12">
      <p className="text-[12px] tracking-[0.16em] text-accent-700 uppercase">
        {declined ? "Payment declined" : "Payment pending"}
      </p>
      <h1 className="mt-3 text-[42px] font-extrabold tracking-[-0.03em]">
        {declined ? "Your card was not charged." : "Your order is not marked paid."}
      </h1>
      <p className="mt-5 max-w-[60ch] leading-[1.65]">
        {declined
          ? "Check the card details or use another card, then try again."
          : "If you just submitted payment, do not submit it again while confirmation is pending."}
      </p>
      {declined && (
        <Link
          href="/checkout"
          className="mt-7 inline-flex border-2 border-divider px-5 py-3 text-[13px] font-extrabold tracking-[0.1em] uppercase hover:bg-surface"
        >
          Return to checkout
        </Link>
      )}
      <a
        href="mailto:bornfromwatercanada@gmail.com"
        className={`${declined ? "ml-5" : "mt-7 inline-block"} text-[12px] text-accent-700 underline`}
      >
        Contact us
      </a>
    </section>
  );
}
