import { ETSY_SHOP } from "@/lib/products";

const social = [
  { label: "Instagram", href: "https://www.instagram.com/born.from.water/" },
  { label: "Pinterest", href: "https://www.pinterest.com/bornfromwater" },
  { label: "Etsy", href: ETSY_SHOP },
];

export function Footer() {
  return (
    <footer className="bg-deep text-foam">
      <section className="flex flex-wrap items-end justify-between gap-8 border-b-2 border-foam/25 px-6 py-11 md:px-12">
        <div>
          <p className="text-[12px] tracking-[0.16em] text-sun uppercase">
            Contact us
          </p>
          <h2 className="mt-3 max-w-[22ch] text-[26px] leading-tight font-extrabold tracking-[-0.02em]">
            Questions about a piece or your order?
          </h2>
        </div>
        <a
          href="mailto:bornfromwatercanada@gmail.com"
          className="border-2 border-sun bg-sun px-5 py-3 text-[13px] font-extrabold tracking-[0.08em] text-deep uppercase transition-colors hover:bg-transparent hover:text-sun"
        >
          bornfromwatercanada@gmail.com
        </a>
      </section>

      <div className="flex flex-wrap items-end justify-between gap-8 px-6 py-11 md:px-12">
        <div>
          <p className="text-[18px] font-extrabold tracking-[-0.02em] uppercase">
            Born From Water
          </p>
          <p className="mt-2 text-[13px] opacity-75">
            Handcrafted gold-filled gemstone bracelets · Vancouver, British
            Columbia
          </p>
        </div>
        <nav className="flex flex-wrap gap-6">
          {social.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer"
              className="text-[13px] text-sun hover:underline"
            >
              {s.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
