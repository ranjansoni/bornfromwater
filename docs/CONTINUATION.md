# Born From Water — continuation on another computer

Prepared 2026-10-30. This is the current handoff for the live storefront. The older `HANDOFF-STRIPE.md` and historical sections of `docs/stripe-migration.md` and `docs/stripe-verification.md` describe earlier stages; use this file first.

## Start here

- GitHub: `https://github.com/ranjansoni/bornfromwater`
- Live site: `https://www.bornfromwater.ca` (`bornfromwater.ca` redirects to `www`).
- On this Windows computer the intended source checkout is `C:\Codex\Bornfromwater\checkout-recovery-fix`, on local branch `codex/pearl-drift-lead-image`. Its source checkpoint before this documentation update is `5b63b63f2ca096cb8d2703479e8121b2223472bc`, which was pushed to `origin/main` and visually verified live. **On the new computer, clone and use `main` at the commit containing this document** (`git rev-parse HEAD`); the final handoff message supplies that full commit ID. The local branch name is not needed to continue.
- `C:\Codex\Bornfromwater` is a separate, older checkout on `codex/godaddy-poynt-checkout` at `63b3eeb`, with extensive uncommitted historical work. Do not mistake it for the current source or merge it wholesale.
- Read tracked `AGENTS.md` before coding. It requires reading the relevant `node_modules/next/dist/docs/` guide before writing Next.js code. Tracked `CLAUDE.md` points to `AGENTS.md`.
- The current `README.md` explains setup and architecture; `docs/stripe-verification.md` preserves the detailed payment launch audit; `docs/order-management.md` explains the owner portal.

## Current product and deployment state

- Next.js 16.3.7 App Router, React 19, TypeScript, Tailwind 4, Neon Postgres, Stripe-hosted Checkout. Public storefront and private `/admin` portal are live. The portal manages products, orders, fulfillment and anonymous cart activity.
- Runtime catalogue rows come from Neon, not directly from JSON. `src/data/products.json` and `src/data/images.json` seed local previews/migrations. `src/lib/catalog-store.ts` applies narrowly guarded image-order compatibility transforms to existing database galleries. When changing product photos, check **both** the seed list and live database/runtime mapping; verify product detail and homepage.
- Twelve products are represented in the seed (seven Signature, five Tide). `TIDE_LIVE` is `true`. On the homepage, Pearl Drift is first, Still Within second and Solé third. These three have `NEW` tags. Home cards show CAD prices and link text `View details`; prices also appear on product pages.
- Latest work: `474019a` published Solé at CAD $42 with its Stripe catalogue entry; `c42864f` added its `NEW` tag; `26aa057` made its home image fill the same inset card size as other products; `5b63b63` replaced the Solé gallery's former first photo with the former fourth (`img-9485.jpeg`). The gallery now has five images. The live Solé page was checked on 2026-10-30: the first image URL is `img-9485.jpeg`, and five gallery views are present.
- Earlier recent work: Pure Heart lead photo; TikTok footer link; Pearl Drift box photo; Aquamarine Tide gallery additions/ordering and duplicate removal; homepage “Out in the World” feature; pearl detail wording across Tide; home/Still Within image fit; homepage hero copy; Pearl Drift and Still Within lead photos; wrist guide; and uniform metal detail. See `git log --oneline` for exact commits.
- Production deploys through GitHub `main` to Vercel project `born-from-water-test-schema` (project ID `prj_hOD8Rgl3CVv5TF6virs3JFCsAOG5`, team ID `team_rC8BxKV134e1YDKRoBo59ZBB`). The project name is historical; the `www.bornfromwater.ca` custom domain is production. The Vercel MCP deployment-list call returned 403 in the last session, but live browser checks confirmed recent public changes. Do not infer deployment status solely from a Git push; check the public pages after each release.

## Production versus sandbox

| Resource | Production | Sandbox / preview |
| --- | --- | --- |
| Site | `https://www.bornfromwater.ca` | Vercel protected preview(s) and localhost; preview URLs may change |
| Stripe | Born From Water live account, `acct_1UKmE8E2BkvcUrRY` | Born From Water sandbox, `acct_1UKmEIE3bgUZeCZr` |
| Neon | Project `sparkling-frost-11144338`, production branch `br-small-queen-ax9251cn`, database `bornfromwater` | Isolated `stripe-preview` branch `br-mute-frost-axxyl0ob`; do not point development at production |
| Vercel settings | Production-only live Stripe restricted key, live webhook, production Neon URL, `STRIPE_ALLOW_LIVE=true`, canonical `APP_URL` | Test-mode restricted key/webhook and isolated Neon URL; no live key in preview/development |
| Orders | Real customer records and historical GoDaddy orders; never copy into Git or a test DB | Synthetic/test orders only |

The production launch, database preservation checks, webhook events and account configuration are documented in `docs/stripe-verification.md`. Do not repeat old migration instructions against production without reconciling the actual schema and taking a current backup. The old prelaunch backup cited there has expired.

Stripe Checkout is one-time CAD payment. Server-side catalogue prices, order snapshots and webhook/Session verification protect paid status. Delivery is restricted to Canada on Vercel using the country header; localhost skips that geolocation check. The current customer offer is **complimentary Canadian shipping until the owner turns it off**. `FREE_SHIPPING_OFFER_ENABLED` defaults to `true` in `src/lib/shipping-config.ts`; with Canada as the sole country it makes checkout shipping zero. The regular configured shipping amount was CAD $10 per order before the offer. Do not set an automatic expiration date. Tax is currently disabled; the owner has not confirmed registration/tax setup. Do not imply taxes are included or make tax changes without checking with the owner.

Checkout has been tested through the cart and Stripe hosted page, including Solé at CAD $42 and free Canadian shipping; no real-money purchase was submitted by Codex. Historical live webhook delivery was verified with an unpaid expired Session. An actual paid production transaction and real customer email delivery remain untested by Codex. For the original investigation and exact scope, use the verification report, not a claim that all payment outcomes were tested live.

## Owner decisions and content history

The following records the requests and corrections in this chat, including earlier choices that were later superseded. Current code/database and live UI win if a historical request conflicts with a later one.

### Store and checkout

- Remove “One shipping fee per order” from every listing. Show test changes before publishing when the owner explicitly asks for test first.
- Offer line: “A little extra love — complimentary shipping within Canada for a limited time.” Canada is the only sales market. The owner explicitly chose **“Until I turn it off”** for the offer duration.
- The owner previously authorized uploading edited public site source (including the existing Google verification token) to `ranjansoni/bornfromwater` and deploying it. Subsequent explicit “publish to live” requests covered many releases. Keep secrets out of new commits.
- Refund policy: 14 days after receipt; email `bornfromwatercanada@gmail.com` with order number and reason; instructions within two business days; unworn/unused in original packaging; refund to original payment method within one to two business days after return receipt, with email notice; customer pays return postage. Live page: `/refund-policy`.
- Product details show `METAL: Genuine 14K Gold-Filled — Not Gold-Plated`. For bracelet details, `SIZING: Adjustable length` and a wrist measurement guide link to `/care#wrist-measurement`. The purchase control still offers numeric 6.5″, 7″ and 7.5″ sizes; the owner explicitly said to change **details text only** and later remove Small/Medium/Large labels in favor of inches. The custom-stone FAQ was removed.
- Owner requested full cart/payment testing for new listings, especially Solé. Keep Stripe test and live accounts separate; do not submit a live payment on the owner's behalf.

### Listings and homepage

- **Still Within**: Tide collection, CAD $52, 14k gold-filled shell-inspired charm, one pearl, 14k gold-filled chain and clasp. Original source photos were in `G:\My Drive\Born From Water\WEBSITE\Still within`. User supplied “STILL WITHIN 🐚” story beginning “Even when the world turns upside down, there is a quiet place within you.” They replaced the earlier shell-cradling sentence with “The ocean symbolizes life's chaos, the shell our sanctuary, and the pearl the peace we carry within.” and “Still Within is a gentle reminder that no matter how turbulent the world becomes, there is always a quiet place within us to retreat to.” They removed the “Still Within — Born From Water / Wear your story” ending and the separate “The meaning” block. Some similar concluding text remains in the story; inspect the live result before changing it. The listing was initially withheld, then explicitly published. It is second on the homepage with `NEW`; its selected fourth photo was made the first; gift-box and other gallery edits are in Git history. Its pearl detail matches Pearl Drift's longer description.
- **Pearl Drift**: Tide listing, CAD $62. The owner replaced “The Stone” with “The Story” and supplied the flow/tide story beginning “Some things are meant to flow, not be forced” and ending “Let go. Trust the tide. Find beauty in the journey.” They requested “High Quality Natural Genuine Freshwater Round 5mm” for the pearl detail, then later requested **“Natural freshwater pearl” for all Tide bracelets**, which is the current displayed value. Material/sizing details were adapted from the owner's Metal/Pearls/Sizing reference screenshot; they said the rows should **replace** the gold-filled badge at that stage. The owner requested photo additions from `G:\My Drive\Born From Water\WEBSITE\Pearl Drift`, removal of the then-current fourth photo, then making the then-eighth photo first; box photo `img-9251.jpeg` was added. Current lead/order is source-controlled. `Just launched` became `NEW`.
- **Tide bracelets**: For Aquamarine Tide, the owner removed historical 2nd/5th/9th photos, later added three plus two more from `G:\My Drive\Born From Water\WEBSITE\Tide Collection\Aquamarine Tide`, made the hand/wrist photo the lead, improved the sequence and removed a duplicate. For Amethyst Tide, the historical 11th image was removed. Pearl description across Tide bracelets was changed to “Natural freshwater pearl.” The homepage has an “♡ Out in the World” feature: “A little piece of Born From Water, out in the world.” and “From our hands to yours. A glimpse of Born From Water in everyday moments.” The first photo features Amethyst Tide on a wrist.
- **Pure Heart**: Owner requested removal of its then-first and fifth images and use of their supplied wrist/lotus image as lead; this was released. See `src/lib/catalog-store.ts` for guarded live-gallery transform.
- **Solé**: Signature bracelet, CAD $42 (a later “CAD $4” message was corrected back to $42). Gold-filled single polished bead on a delicate chain; supplied title “Solé — One & Only ✨”. Story speaks of the sun, individuality and simplicity. The owner moved “One golden bead. One beautiful reminder. In a world of endless comparisons, there is only one you. Unique. Radiant. Enough, just as you are.” into **The meaning** and out of **The story**. They asked to crop/replace the lead image from `G:\My Drive\Born From Water\WEBSITE\SOLE`, place Solé third on the homepage, test cart/payment, publish, mark `NEW`, equalize its home image size, then replace its first image with its former fourth. The last photo change is `5b63b63`; live was verified 2026-10-30.
- Homepage prices were first removed, then explicitly restored for every listing. The action label changed from “VIEW DETAILS & ORDER” to “VIEW DETAILS”. Hero copy became “Ocean-inspired jewelry, handcrafted with genuine gemstones, freshwater pearls, and 14k gold-filled details designed to carry meaning.” Home images should show each piece at a comparable size without excessive zoom; Still Within lead-image fit was separately adjusted.
- Social links include Instagram, Pinterest and the owner-supplied TikTok `https://www.tiktok.com/@born.from.water6`.

Exact currently displayed copy and image order are in the runtime catalogue/checked-in sources. The first image in `src/data/images.json` drives local previews. On live, `publishedImages()` in `src/lib/catalog-store.ts` may reshape a stored gallery; the database row may also have been edited in `/admin/products`.

## Pending work in priority order

1. **Move the working environment safely.** Clone `main` on the new Mac and confirm the handoff commit. Reconnect GitHub, Vercel, Neon and Stripe under the owner's accounts. Transfer only necessary secrets through an approved secure channel; do not paste them into chat/Git. Keep production and sandbox separated.
2. **Establish a clean test baseline.** Use Node 22 (the documented baseline), run `npm ci`, then test, lint, typecheck and build. On this Windows host on 2026-10-30, sandboxed `npm test` failed before assertions because `tsx` called `os.userInfo()` and Node 25/24 returned `uv_os_get_passwd ENOMEM`. An unsandboxed run reached the assertions and reported exactly three catalogue failures, described below. Fix their stale expectations/fixtures after confirming the intended New Beginnings gallery and audit behavior. TypeScript, ESLint on changed source and `git diff --check` passed for the last image change.
3. **Verify the new machine's sandbox checkout end to end.** With separate sandbox Neon/Stripe credentials, test item sizing, cart, free shipping, hosted Checkout, cancel/retry, signed webhook, order status and admin visibility. Local product browsing can work without `DATABASE_URL`, but real checkout needs a configured database and test keys.
4. **Keep production operations verified.** After each content release, check the public page and photo order. Vercel MCP deployment-list access returned 403 in the previous session; the Vercel CLI was not installed there. The public live Solé page, however, showed the new lead and five images after `5b63b63`.
5. **Business follow-ups:** owner can turn off the limited-time shipping offer when ready; confirm tax obligations/configuration separately; optionally perform an owner-controlled real paid purchase to verify paid production flow and email receipt. Do not infer those from an unpaid hosted Session.
6. **Future catalogue work:** use source photo folders if the owner requests more additions/edits; treat image indices as the current order at the time of each request. Avoid reapplying historical removal instructions to today's gallery.

## Known issues and verification limits

- Full `npm test` on 2026-10-30: all tests outside `tests/catalog.test.mjs` passed; three catalogue assertions failed. `catalogue seed preserves every product photograph, word, price and identity` and `repeatable migration preserves owner edits, photos, historical and pending orders` expect New Beginnings `12.png` where the current seed yields `05.jpg` and `06.jpg`. `concurrent editor saves cannot overwrite one another; only successful changes are audited` expected one audit record and observed thirteen. These failures predate this documentation update. Review fixtures and intended gallery before changing production data.
- In the restricted Windows shell, `npm test` fails earlier at `uv_os_get_passwd ENOMEM` under both Node 25 and bundled Node 24. The unsandboxed run above bypassed that host issue; use Node 22 on the new machine and document its result.
- Production paid checkout and receipt delivery have not been exercised by Codex with real money. Prior live verification reached hosted Checkout and proved signed processing of an **unpaid expired** Session; sandbox paid flow and synthetic tests cover more outcomes.
- The Vercel MCP deployment-list request returned 403 in the prior session; Vercel CLI was not installed. Public live UI checks verified the latest Solé gallery, but future deployment inspection may require reconnecting the account or using the new machine's authorized Vercel CLI.
- Original design handoff and source Google Drive photo folders are outside Git. The Drive path was inaccessible from the current host during this inventory.

## New-computer setup and tests

```bash
git clone https://github.com/ranjansoni/bornfromwater.git
cd bornfromwater
git checkout main
git rev-parse HEAD
node --version               # use Node 22 for the documented test baseline
npm ci
cp .env.example .env.local  # fill with SANDBOX values only, securely
npm test
npm run lint
npx tsc --noEmit
npm run build -- --webpack
npm run dev -- -p 3100
```

Open `http://localhost:3100/` and `/shop/sole`; `localhost` is never the public site. Next.js does **not** load `.env.publish.local`. For real sandbox Checkout, configure sandbox `DATABASE_URL`, `STRIPE_ACCOUNT_ID`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ORDER_SIGNING_SECRET`, `APP_URL`, shipping/tax flags and owner portal values through `.env.local`; see `.env.example` and `docs/stripe-migration.md`. Do not copy production secrets into a development build. `npm run build -- --webpack` is the documented fallback when Turbopack worker ports are restricted.

For an existing database, review the numbered SQL migrations and their guards before applying anything; use `src/db/schema.sql` only for a fresh database. Local seed JSON and live Neon can differ after owner edits. Use `docs/order-management.md` for admin setup. The current site design uses square corners, no shadows, left-aligned labels and Archivo; consult the tracked design rules and current UI before altering layout.

## File inventory and separate transfers

**Already on GitHub in the current checkout:** application source; `public/products/...` assets used by live listings; `AGENTS.md` and `CLAUDE.md`; `README.md`; payment/admin docs; SQL migrations through `022-sole.sql`; test suite; and this handoff after it is pushed. Git history holds prior product edits. `git status --short` was clean except the two local-only files below before documentation work. There were **no unpushed commits** at the `5b63b63` source checkpoint (`HEAD == origin/main`).

**Untracked in the current checkout:** `checkout-recovery.patch` and `pearl-drift-review.html`. Their provenance/content were not audited for this transfer; they are not included in the push and should be inspected locally before deciding whether to transfer them. Do not indiscriminately `git add .`.

**Ignored in the current checkout:** generated `node_modules/`, `.next/`, `next-env.d.ts`, and `*.tsbuildinfo`; regenerate these with `npm ci` and a build. `.env.example` is tracked. No local `.env.local`, `.vercel/` link or owner-password file was found in this checkout at inventory time. Ignored files may be created later, so recheck before wiping the Windows computer.

**Older sibling checkout at `C:\Codex\Bornfromwater`:** a separate Git tree on `codex/godaddy-poynt-checkout` at `63b3eeb` with **no commits from that branch pushed as part of this handoff**. Its modified tracked files are `package.json`, `package-lock.json`, `src/app/shop/[slug]/page.tsx`, `src/app/sitemap.ts`, `src/data/images.json`, `src/db/schema.sql`, `src/lib/checkout-service.ts`, `src/lib/order-store.ts` and `src/lib/payment-currency.ts`. Its untracked items include `HANDOFF-STRIPE.md`, `handoff/BornFromWater-Stripe-Handoff-2026-09-29.zip`, `handoff/tracked-changes.patch`, multiple local preview PNGs, `public/products/crystal-tide/13.png`–`16.png`, `public/products/new-beginnings/12.png`, `public/products/peridot-tide/09.png`–`10.png`, `public/products/protection/08-hydrangeas.png`, `public/products/pure-heart/06-presentation.png`, `public/products/quiet-strength/05-wrist.jpeg`, `public/try-on/`, `src/components/ProductGallery.tsx`, `src/db/migrations/`, `src/lib/stripe-checkout.ts`, `src/lib/stripe-config.ts`, `src/lib/stripe.ts` and the nested `checkout-recovery-fix/` tree. It also contains ignored `.env.publish.local`; its value was **not read or committed**. This older tree is not a source of unpushed current-site code. Preserve it separately only if its historical work or reference screenshots are needed. Do not push it over current `main`.

**External design and media:** An older README referenced `../design_handoff_born_from_water` as the original design handoff, but no directory by that name was found under `C:\Codex` during this inventory. Locate and transfer it separately if the original design spec is needed; it is not in GitHub. User source-photo folders on Google Drive (`G:\My Drive\Born From Water\WEBSITE\...`, especially Still within, Pearl Drift, Aquamarine Tide and SOLE) are external originals; a direct access check of the Drive path was denied on this host, so their current contents could not be inventoried. Selected published assets are already committed; the Drive folders themselves are **not** in Git. Reconnect Google Drive on the new Mac if future image work needs originals. Clipboard screenshots in Windows temp paths and local preview PNGs outside this checkout are not part of the repository.

**Codex context and custom instructions:** Project instructions `AGENTS.md` and `CLAUDE.md` are tracked. No project-local `.agents/`, `.codex/` or `SKILL.md` was found in the current checkout. The Windows user profile has system/plugin skills under `.codex/skills` and `.codex/plugins` (including a local `review-agent` system skill); those installations, browser sessions, OAuth connections, Codex chat history and account authentication are not stored in this repository. Sign in to the appropriate Codex account on the Mac and reconnect any required apps. Do not copy the entire `.codex` profile or its secrets into Git.

## Security and handoff boundaries

Do not commit `.env*` (except the tracked template), `.vercel/`, passwords, API/webhook keys, `DATABASE_URL`, customer/order exports or browser cookies. Production customer data remains in production Neon/Stripe, not in this handoff. The public GitHub repo is suitable for source, public product copy and this non-secret operational summary. Any owner credentials or external originals that must move require a separate secure transfer.
