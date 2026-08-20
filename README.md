# Born From Water

Marketing and catalogue site for [Born From Water](https://www.etsy.com/ca/shop/BornFromWater),
a Vancouver maker of handcrafted 14k gold-filled gemstone bracelets.

Built from the design handoff in `../design_handoff_born_from_water` — see its
`README.md` for the binding spec (tokens, screen layouts, copy).

**No commerce logic.** Every buy action is an outbound link to an Etsy listing.
Etsy owns checkout, payment, price and stock.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind 4 · fully static (`next build`
prerenders every route). Deploy target: Vercel.

```bash
npm run dev     # http://localhost:3000
npm run build   # static export of all 16 routes
npm run lint
```

## Design rules (from the Modernist system — these are binding)

- **Zero border radius, everywhere.** Enforced globally in `globals.css`.
- **No shadows.** Also enforced globally.
- **Everything flush left**, including button labels. Never centre a label.
- 2px rules between sections; 1px surface rules inside tables and FAQ lists.
- Archivo only (400/700/800), self-hosted via `next/font`.
- **Exactly two gradients** — the hero panel and the closing banner. The
  waterline stop at 32/33% is hard, never blended. Do not add a third.

## Content

`src/data/products.json` is the catalogue. Prices are **display-only strings
including currency** — never parse them or convert currency.

### Product names were corrected against Etsy

The design handoff used Etsy's **SEO listing titles** as product names, not the
owner's actual product names, and two of the six also carried the wrong stone.
Worse, the two black tourmaline pieces had their names, blurbs and stone notes
**crossed with each other**.

Every name, slug, stone, blurb and stone note was re-derived from each listing's
own Etsy copy and from the card photographed in its own product images:

| Slug | Name | Stone | Etsy listing opens with |
| --- | --- | --- | --- |
| `new-beginnings` | New Beginnings Bracelet | Moonstone + peridot | "New Beginnings / Every new chapter begins with a single step." |
| `pure-heart` | Pure Heart Bracelet | Rose quartz + peridot | "PURE HEART / Wear love. Give love. Choose love." |
| `ocean-mist` | Ocean Mist Bracelet | Moonstone | "Ocean Mist Moonstone Bracelet" |
| `crystal-tide` | Crystal Tide Bracelet | Peridot + clear quartz | "CRYSTAL TIDE / For the courage to begin again." |
| `protection` | Protection Bracelet | Black tourmaline + clear quartz | "PROTECTION — Stand rooted. Move forward with confidence" |
| `quiet-strength` | Quiet Strength Bracelet | Black tourmaline | "QUIET STRENGTH / Some of the strongest people carry their strength quietly." |

The handoff's original slugs (`peridot`, `dainty-gemstone`, `black-tourmaline`,
…) no longer exist and return 404. Nothing was public when they changed.

### Stories

Each product carries a `story` — a title and two paragraphs that render between
the name and the price, standing in for `description` on the page (which still
feeds metadata and JSON-LD).

Unlike the rest of the site's copy, **the stories are written for the brand
rather than taken from the owner's words verbatim.** They are built outward from
each piece's real card line, and they deliberately assert no biographical facts
and no health or metaphysical claims — stone associations are always framed as
tradition ("has long been worn for…"). None of them names its own piece, so the
copy survives any future rename. **The owner should read and edit all six before
launch.**

`src/data/images.json` maps each slug to its images in Etsy listing order, each
tagged `photo` or `graphic`:

- `photo` — real product photography (46 images)
- `graphic` — the brand's Etsy info slides: gold-filled chain, lotus charm,
  stone properties, FAQs (26 images)

Product galleries render **every** image in listing order. Grid cards and
JSON-LD use photographs only, via `cardImage()` in `src/lib/products.ts`.

Images were pulled at full resolution (`il_fullxfull`) from the live Etsy
listings and are served from `/public/products/<slug>/`. They are not
hotlinked — Etsy's CDN is not licensed for that and its URLs are unstable.

## The Tide collection is built but hidden

`TIDE_LIVE` in `src/lib/products.ts` is `false`. Every Tide field is invented
placeholder data and its Etsy URLs point at the shop, not real listings.

While it is `false`: `/collections/tide` and the three Tide product pages return
404, the announcement bar and the "See Tide, new" button are absent, the nav
drops "Tide", the landing collection cell reads "Coming soon", and Tide is
excluded from the sitemap and the product grid.

To launch Tide: replace the three entries in `products.json` with real names,
stones, prices, descriptions and listing URLs, drop the `placeholder` flags, add
photography under `/public/products/<slug>/`, register it in `images.json`, then
flip `TIDE_LIVE` to `true`.

## Still outstanding before launch

- Per-route OG images (metadata and JSON-LD are wired; images are not).
- The `bornfromwater.ca` base URL in `layout.tsx`, `sitemap.ts` and `robots.ts`
  is a placeholder — set it to the real domain.
- Instagram and Pinterest URLs in `Footer.tsx` and `about/page.tsx` are guesses.
- A real logo. The handoff says none exists, but the Etsy info slides carry a
  gold lotus mark and a serif `BORN FROM WATER / JEWELRY WITH MEANING` wordmark.
  That identity has not been reconciled with the Archivo set-type wordmark used
  here.
