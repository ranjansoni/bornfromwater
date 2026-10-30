# Born From Water

Live catalogue and storefront for Born From Water, a Vancouver maker of 14k gold-filled gemstone and freshwater-pearl bracelets. Production is [www.bornfromwater.ca](https://www.bornfromwater.ca). **For a new computer or a new Codex session, read [the current continuation handoff](docs/CONTINUATION.md) first.** The older [Stripe handoff](HANDOFF-STRIPE.md) is historical and contains prelaunch statements that are no longer current.

## What runs today

Next.js 16.3.7 App Router, React 19, TypeScript, Tailwind 4, Neon Postgres and Stripe-hosted Checkout. The public site has Signature and Tide collections, product galleries, CAD prices, a browser cart, Canada-only purchasing, a complimentary-Canadian-shipping offer, care/wrist-measurement information, and a returns policy. The private `/admin` portal manages products, orders, packing/shipping/delivery and anonymous cart activity.

Checkout validates cart contents against server catalogue prices, stores a pending order in Postgres and redirects to a Stripe-hosted one-time CAD payment. Signed webhooks and server-retrieved Sessions confirm payment; a confirmation URL alone cannot mark an order paid. Historical GoDaddy orders remain readable; the old charge endpoint returns HTTP 410. Production launched on 2026-10-01. See [the launch and verification record](docs/stripe-verification.md) for what was and was not exercised in live mode.

## Continue on a new computer

Use GitHub `ranjansoni/bornfromwater` **main** and the commit named in [CONTINUATION.md](docs/CONTINUATION.md). The Windows parent folder has an older dirty Git checkout; it is not the current source. Project-specific `AGENTS.md` and `CLAUDE.md` are tracked. `AGENTS.md` requires reading the relevant guide under `node_modules/next/dist/docs/` before changing Next.js code.

Use Node 22 for the documented test baseline. For a local preview without payment credentials, the development catalogue can use checked-in seed data. For a real sandbox checkout, set up a **separate** Neon branch and Stripe sandbox credentials in ignored `.env.local`; never put production secrets in local test configuration or Git.

```bash
git clone https://github.com/ranjansoni/bornfromwater.git
cd bornfromwater
npm ci
cp .env.example .env.local  # fill in sandbox values securely if testing checkout
npm test
npm run lint
npx tsc --noEmit
npm run build -- --webpack
npm run dev -- -p 3100
```

Next.js does not load `.env.publish.local`. `npm run build -- --webpack` and `npm run dev -- --webpack` are the supported fallback if Turbopack worker ports are restricted. A first build may need network access for the Google font loader. The test suite uses embedded PostgreSQL with synthetic orders and signed Stripe fixtures; it does not need live credentials. An end-to-end sandbox payment/webhook test does. On the prior Windows host, Node 24/25 test startup failed at `os.userInfo()` with `uv_os_get_passwd ENOMEM`; details and other known test issues are in the continuation handoff.

For a fresh database, use `src/db/schema.sql`; for an existing database, review the additive `src/db/migrations/` in order and back up first. Never recreate an existing production `orders` table. Preserve `ORDER_SIGNING_SECRET` for historical signed links. See [Stripe setup](docs/stripe-migration.md) and [owner portal setup](docs/order-management.md). The current shipping offer is controlled by `FREE_SHIPPING_OFFER_ENABLED`; the owner chose to keep it active until manually disabled.

## Catalogue and images

Neon `catalog_products` is the runtime catalogue and authoritative server price. `/admin/products` can edit supported fields directly. `src/data/products.json` and `src/data/images.json` are the checked-in seed/local-preview data, **not a live database export**. `src/lib/catalog-store.ts` contains guarded image-order transforms for rows created before recent photo releases. `src/lib/products.ts` defines shared product types, `TIDE_LIVE=true`, and `cardImage()`. Product images served by the app are checked in under `public/products/<slug>/`; original source folders on the owner's Google Drive are external and need separate access for future editing.

The live shop currently has twelve seed products: seven Signature and five Tide. Pearl Drift, Still Within and Solé are the first three homepage cards and carry `NEW` badges; Solé is CAD $42. The current homepage card shows prices and “View details”. The Solé live gallery's first image is `img-9485.jpeg` after the owner asked to replace its former first image with the former fourth. The exact owner-approved copy, gallery histories, decisions and current limitations are in [CONTINUATION.md](docs/CONTINUATION.md) and the source files.

The original design handoff referenced by an older README as `../design_handoff_born_from_water` was not found in the current Windows workspace. It is not in this repository; transfer it separately if the original design spec is needed. The current UI and tracked source remain available. The established design uses square corners, no shadows, left-aligned labels and Archivo; inspect the relevant components and styles before changing layout.

## Documentation

- [Current continuation and file-transfer inventory](docs/CONTINUATION.md)
- [Stripe launch and verification history](docs/stripe-verification.md)
- [Stripe setup and migration background](docs/stripe-migration.md)
- [Owner portal and order management](docs/order-management.md)
- [Historical September Stripe handoff](HANDOFF-STRIPE.md)
