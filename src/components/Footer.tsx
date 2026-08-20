import { ETSY_SHOP } from "@/lib/products";

const social = [
  { label: "Instagram", href: "https://www.instagram.com/bornfromwater" },
  { label: "Pinterest", href: "https://www.pinterest.com/bornfromwater" },
  { label: "Etsy", href: ETSY_SHOP },
];

export function Footer() {
  return (
    <footer className="flex flex-wrap items-end justify-between gap-8 bg-deep px-6 py-11 text-foam md:px-12">
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
    </footer>
  );
}
