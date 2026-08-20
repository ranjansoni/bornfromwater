import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Care, materials & policies",
  description:
    "Everything that keeps a piece looking new — materials, daily care, delivery, payment and returns.",
};

const materials = [
  {
    label: "Metal",
    value: "14k gold-filled — a bonded layer of solid gold, not plating",
  },
  {
    label: "Stones",
    value: "Genuine peridot, rose quartz, clear quartz and black tourmaline",
  },
  { label: "Water", value: "Waterproof — safe for showering and swimming" },
  {
    label: "Sizing",
    value: "Made to your measurement; add it to your order note",
  },
];

const dailyCare = [
  "Put your bracelet on last — after perfume, lotion and sunscreen.",
  "Rinse in fresh water after salt water or chlorine, then dry with a soft cloth.",
  "Avoid household cleaners and jewellery dips; they dull the stones.",
  "Store flat and dry, out of direct sunlight, when you aren't wearing it.",
  "Polish gently with a dry microfibre cloth to bring the shine back.",
];

const policies = [
  {
    h: "Delivery",
    p: "See item details for estimated arrival times. Ships from Vancouver, BC.",
  },
  {
    h: "Customs & import taxes",
    p: "For US deliveries, import duties and fees are included at checkout. Buyers elsewhere may pay on delivery.",
  },
  {
    h: "Payment",
    p: "Handled securely by Etsy: PayPal, Visa, Mastercard, Apple Pay, Klarna and gift cards.",
  },
  {
    h: "Returns & cancellations",
    p: "See item details for eligibility. Cancellations are not accepted — message me with any problem.",
  },
];

/** 1 column → 2×2 at tablet → 4 across at desktop. Rules follow the layout. */
const policyRules = [
  "",
  "rule-t sm:border-t-0 sm:rule-l",
  "rule-t lg:border-t-0 lg:rule-l",
  "rule-t sm:rule-l lg:border-t-0",
];

const faq = [
  {
    q: "Will it tarnish?",
    a: "Gold-filled holds its colour far longer than plated jewellery. With normal care it stays bright for years.",
  },
  {
    q: "How do I measure my wrist?",
    a: "Wrap a strip of paper around your wrist, mark where it meets, and measure it flat. Send that number in your order note.",
  },
  {
    q: "Can I request a custom stone?",
    a: "Message me on Etsy. Custom combinations are made when the stones are available.",
  },
  {
    q: "Does it arrive gift-ready?",
    a: "Every order ships in Born From Water packaging, ready to give.",
  },
];

export default function Care() {
  return (
    <>
      <section className="rule-b px-6 pt-16 pb-11 md:px-12 md:pt-17">
        <p className="text-[12px] tracking-[0.16em] text-accent-700 uppercase">
          Care, materials &amp; policies
        </p>
        <h1 className="mt-5 max-w-[18ch] text-[38px] leading-none font-extrabold tracking-[-0.035em] md:text-[62px]">
          Everything that keeps a piece looking new.
        </h1>
      </section>

      <section className="rule-b grid grid-cols-1 md:grid-cols-2">
        <div className="flex flex-col gap-4 px-6 py-12 md:px-12 md:rule-r">
          <h2 className="text-[28px] font-extrabold tracking-[-0.02em]">
            Materials
          </h2>
          <dl className="rule-t mt-2">
            {materials.map((m, i) => (
              <div
                key={m.label}
                className={`grid grid-cols-1 gap-4 py-3 sm:grid-cols-[140px_1fr] ${
                  i < materials.length - 1
                    ? "border-b border-surface"
                    : "rule-b"
                }`}
              >
                <dt className="text-[11px] tracking-[0.1em] text-mid uppercase">
                  {m.label}
                </dt>
                <dd className="text-[14px]">{m.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rule-t flex flex-col gap-4 px-6 py-12 md:border-t-0 md:px-12">
          <h2 className="text-[28px] font-extrabold tracking-[-0.02em]">
            Daily care
          </h2>
          <ol className="flex list-decimal flex-col gap-3 pl-5">
            {dailyCare.map((c) => (
              <li key={c} className="text-[15px] leading-[1.6]">
                {c}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="rule-b grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {policies.map((p, i) => (
          <div
            key={p.h}
            className={`flex flex-col gap-2.5 px-8 py-10 ${policyRules[i]}`}
          >
            <h3 className="text-[17px] font-extrabold">{p.h}</h3>
            <p className="text-[14px] text-mid">{p.p}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-12 px-6 py-13 md:grid-cols-[1fr_2fr] md:px-12">
        <h2 className="text-[32px] font-extrabold tracking-[-0.025em]">
          Questions
        </h2>
        <div>
          {faq.map((f, i) => (
            <div
              key={f.q}
              className={`py-4 ${i === 0 ? "rule-t" : "border-t border-surface"} ${
                i === faq.length - 1 ? "rule-b" : ""
              }`}
            >
              <h3 className="text-[17px] font-extrabold">{f.q}</h3>
              <p className="mt-2 text-[15px] text-mid">{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
