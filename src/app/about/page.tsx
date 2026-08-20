import type { Metadata } from "next";
import Image from "next/image";
import { Button } from "@/components/Button";
import { ETSY_SHOP } from "@/lib/products";

export const metadata: Metadata = {
  title: "About",
  description:
    "Born From Water is inspired by the quiet strength, beauty, and constant renewal found in the ocean.",
};

export default function About() {
  return (
    <>
      <section className="rule-b px-6 pt-16 pb-12 md:px-12 md:pt-19">
        <p className="text-[12px] tracking-[0.16em] text-accent-700 uppercase">
          About
        </p>
        <h1 className="mt-5 max-w-[20ch] text-[40px] leading-none font-extrabold tracking-[-0.035em] md:text-[70px]">
          Inspired by the ocean. Handcrafted with purpose.
        </h1>
      </section>

      {/* Image first on mobile, text-left on desktop. */}
      <section className="rule-b grid grid-cols-1 md:grid-cols-[1.15fr_1fr]">
        <div className="order-2 flex flex-col gap-[18px] px-6 py-14 md:order-1 md:px-12 md:rule-r">
          <p className="max-w-[60ch] text-[18px] leading-[1.6]">
            Born From Water is inspired by the quiet strength, beauty, and
            constant renewal found in the ocean. Just as water shapes every
            shoreline over time, we believe life&rsquo;s experiences shape who
            we become.
          </p>
          <p className="max-w-[60ch] text-[16px] leading-[1.65] text-mid">
            Each bracelet is thoughtfully handcrafted in Vancouver, Canada using
            carefully selected genuine gemstones and 14k gold-filled components
            chosen for their quality and durability.
          </p>
          <p className="max-w-[60ch] text-[16px] leading-[1.65] text-mid">
            Every gemstone is chosen for its natural beauty and symbolic
            meaning, creating bracelets that are simple enough for everyday wear
            while carrying a deeper personal story. Whether you&rsquo;re
            celebrating a new beginning, seeking calm, or looking for a
            meaningful gift, each piece is made with intention and care.
          </p>
          <p className="max-w-[60ch] text-[16px] leading-[1.65] text-mid">
            We hope every Born From Water bracelet serves as a gentle reminder
            of strength, balance, and the beauty of new beginnings.
          </p>
          <p className="mt-2 text-[30px] font-extrabold tracking-[-0.02em]">
            Wear your story.
          </p>
        </div>

        <div className="relative order-1 min-h-[360px] w-full min-w-0 overflow-hidden md:order-2 md:min-h-[560px]">
          <Image
            src="/site/about.jpg"
            alt="A Born From Water bracelet worn on the wrist"
            fill
            sizes="(max-width: 768px) 100vw, 45vw"
            className="object-cover"
          />
        </div>
      </section>

      <section className="flex flex-wrap items-end justify-between gap-8 px-6 py-13 md:px-12">
        <div>
          <p className="text-[12px] tracking-[0.16em] text-mid uppercase">
            Follow along
          </p>
          <h2 className="mt-3 text-[26px] font-extrabold tracking-[-0.02em]">
            New pieces first on Instagram
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            href="https://www.instagram.com/bornfromwater"
            variant="secondary"
          >
            Instagram
          </Button>
          <Button
            href="https://www.pinterest.com/bornfromwater"
            variant="secondary"
          >
            Pinterest
          </Button>
          <Button href={ETSY_SHOP}>Shop on Etsy</Button>
        </div>
      </section>
    </>
  );
}
