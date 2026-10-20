import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Returns & Refunds",
  description: "Born From Water's return and refund policy for orders within Canada.",
};

const sections = [
  {
    title: "How to Initiate a Return",
    content: (
      <>
        Contact us at{" "}
        <a className="font-semibold text-accent-700 underline underline-offset-2" href="mailto:bornfromwatercanada@gmail.com">
          bornfromwatercanada@gmail.com
        </a>{" "}
        with your order number and reason for return. We&apos;ll provide return instructions within 2 business days.
      </>
    ),
  },
  {
    title: "Conditions",
    content: "Items must be unworn, unused, and returned in their original packaging.",
  },
  {
    title: "Refunds",
    content: "Refunds will be issued to your original payment method within 1–2 business days of us receiving the returned item. You will be notified by email once your refund has been processed.",
  },
  {
    title: "Return Shipping",
    content: "Return shipping costs are the responsibility of the customer.",
  },
];

export default function RefundPolicy() {
  return (
    <main>
      <section className="rule-b px-6 pt-16 pb-11 md:px-12 md:pt-17">
        <p className="text-[12px] tracking-[0.16em] text-accent-700 uppercase">Policies</p>
        <h1 className="mt-5 text-[38px] leading-none font-extrabold tracking-[-0.035em] md:text-[62px]">
          Returns &amp; Refunds
        </h1>
        <p className="mt-6 max-w-[65ch] text-[17px] leading-[1.7] text-mid">
          All customers may return items within <strong>14 days</strong> of receiving their order.
        </p>
      </section>

      <section className="px-6 py-12 md:px-12">
        <div className="max-w-[75ch]">
          {sections.map((section) => (
            <div key={section.title} className="rule-b py-6 first:pt-0">
              <h2 className="text-[24px] font-extrabold tracking-[-0.02em]">{section.title}</h2>
              <p className="mt-3 text-[15px] leading-[1.7] text-mid">{section.content}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
