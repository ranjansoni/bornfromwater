# Stripe migration verification — 2026-09-29

## Canada-only purchasing — 2026-10-01

- Purchasing eligibility comes from Vercel's `x-vercel-ip-country` on Vercel
  deployments only. `CA` is allowed; other, missing or malformed countries are
  blocked. The country is not inferred from browser language, timezone, request
  parameters or customer-entered addresses. The public catalogue stays readable,
  with eligibility in a private, uncached response.
- Storefront Add to cart, cart quantity increases and checkout controls honor this
  policy. Adds and increases fetch fresh eligibility, and navigation/focus refresh
  it too. Failed refreshes disable purchasing until a successful refresh. Existing
  stored carts are preserved and can still be reduced/cleared.
- Checkout and cart-observation POSTs return 403 before reading/mutating orders or
  contacting Stripe. A rejected retry retains its original checkout identity.
  The restriction does not apply to admin, signed order-status pages or webhook
  handlers. There are no database changes or modifications to historical orders.
- All 102 tests, lint, TypeScript and the production webpack build pass. Coverage
  includes Canada/foreign/unknown/malformed countries, non-Vercel fail-closed
  behavior, alternate-header rejection, no downstream side effects, immutable
  existing checkouts with Canadian retry recovery, and server-rendered enabled/
  disabled storefront controls. Existing payment/webhook tests also pass.
- Local `next dev` without Vercel environment variables permits development;
  this exception never applies to hosted builds. Local production builds need a
  trusted Vercel environment for purchasing. There is no deployed test override.
- Limitations: this is IP geolocation, not proof of residency. VPNs/proxies and
  geolocation errors can affect eligibility. A Stripe-hosted Session URL issued
  while eligible may still be opened directly afterward; the store cannot apply
  its IP guard inside Stripe's hosted page. Stripe still requires Canadian
  shipping addresses. Browser-local storage can be manually edited, but a forged
  cart cannot bypass the checkout endpoint's country check.
- Code commit `2619f86` deployed successfully to the existing sandbox preview
  (`dpl_5DqpCzp8EXsAvYj8MxEkzoVaULih`). Browser checks from the current Canadian
  connection added New Beginnings, increased quantity to two (CA$130), reduced it
  to one, and opened Stripe sandbox Checkout: CA$65 + CA$10 shipping, no tax,
  CA$75 total and Canada as the only shipping country. No payment was submitted.
  The unpaid Session is
  `cs_test_a1zTKMTqoFbej3G4Jq7AhzPjQsTY1Yiuh4NXffeSVsLi4ePCdlKUgl0dv5`.
  The test cart was cleared afterward; the pending order remains for audit.
  Admin products loaded correctly after deployment. Foreign-country behavior was
  tested with controlled request headers/rendering, not an overseas VPN.
- Production and the separately paused live-preview branch remain unchanged.
  Vercel geolocation reference: https://vercel.com/docs/headers/request-headers#x-vercel-ip-country

## Dynamic product catalogue — 2026-10-01

- Code commit `058c800` deployed successfully to the existing sandbox preview as
  `dpl_HgkHpMYKjja68LxUx6iKXk4h7Qq1`. The owner can manage all nine products at
  `/admin/products` using the existing admin login. Storefront design and photo
  galleries are preserved; database edits drive listings, details, metadata,
  sitemap, cart observations and new checkout prices.
- All 95 automated tests, lint, TypeScript and webpack build pass. New coverage
  uses PGlite to verify exact seed preservation, repeatable migration, owner edits,
  disabled/coming-soon states, conflict handling and atomic audit records,
  authentication/origin checks, validation, JSON-LD escaping, database pricing,
  stale-price rejection, unchanged existing checkouts and database failure behavior.
- Applied migration 006 only to Neon `stripe-preview` (`br-mute-frost-axxyl0ob`).
  It added two catalogue tables and imported nine products. The original ten orders
  retain checksum `0c9b72ff4e02baba98aaebccb6c97cd5` before migration and after all
  hosted checks (excluding the new unpaid checkout below).
- Browser verification saved a temporary name and CA$72.35 price for New Beginnings,
  confirmed storefront wording and cart price, disabled it, confirmed direct-page
  404 and removal from the Signature collection, and verified an existing cart
  displayed an unavailable item with payment blocked. Restoring availability worked.
  Search plus availability filtering returned the expected single product.
- An actual app-created sandbox Stripe Session displayed the edited name,
  CA$72.35 merchandise, CA$10 shipping, no tax and CA$82.35 total, Canada only:
  `cs_test_a1UoPMrw7xs8Xh94AD1V2eJ010zmSFaK2RHegGjHyumVvnUJhPtJWXNR74`.
  No payment was submitted. Its retained pending order is
  `db109e9d-b60c-4e1d-b1c5-b110c9188171`, subtotal 7235. It keeps the original checkout
  snapshot even though the product was subsequently restored.
- Restored New Beginnings to its original name, CA$65 and Active (version 5);
  the four edits remain in catalogue audit history. Cleared the test cart.
  Desktop visual inspection confirmed the editor layout and preserved storefront.
- Production and the separately prepared live-payment preview were not changed.
  Catalogue work must be merged and migration 006 applied to the isolated live
  database before live setup resumes. Sandbox catalogue edits do not automatically
  propagate across databases. No additional owner credentials were needed.

## Reversible order deletion — 2026-10-01

- Confirmed Stripe orders now have **Delete order → Confirm delete** and
  **Restore order** controls. Default lists/counts hide deleted orders;
  **Show deleted orders** includes labelled rows and persists through search,
  status changes and pagination. Deleted orders cannot be edited for fulfillment.
- All 86 automated tests, ESLint, TypeScript and the webpack production build
  pass. Coverage includes migration from the previous schema, hiding/restoring,
  preserved payment/customer/shipment data, version conflicts, duplicate requests,
  concurrent fulfillment saves, pagination, authentication/origin checks,
  validation and account/mode/historical-order boundaries.
- Migration 005 ran only on Neon `stripe-preview`. Before/after checksums matched
  for all 10 orders (`0c9b72ff4e02baba98aaebccb6c97cd5`), existing fulfillment fields
  (`8680dd64b22044b5e54c5727ed59d8ac`, excluding new `deleted_at`), and activity fields
  (`eb6ec3eb530f955bc79ebe3949e2af88`, excluding new `action`).
- Commit `f26542e` deployed successfully to Preview as
  `dpl_3kGb3SYcG1Lkw3Uaz78wKjYfK5iV`. Browser testing soft-deleted sandbox order
  `25e22760-0ed9-4de8-b5fc-94fcb201b921`, confirmed removal from the default list
  and count, revealed its Deleted label using the checkbox, searched for it with
  the checkbox retained, and restored it. The deletion banner blocked editing;
  restoration returned **To pack**, the original details, and the editable form.
  Both actions persisted in activity history after navigation.
- The test order was restored and all three paid sandbox orders remain visible.
  The owner's shipped order was not modified. After browser testing all 10
  original order/payment records still matched the checksum above. No orders were
  permanently deleted, no refund was issued, and production was not deployed.

## Anonymous cart reporting — 2026-09-30

- Added authenticated `/admin/carts`: recent and potentially abandoned (24-hour
  inactivity) views, item quantities/subtotal, last activity and checkout links.
  No contact collection or reminder emails. Views exclude empty carts and
  matching paid/processing checkouts and cover the last 30 days.
- All 79 tests, ESLint, TypeScript and the production webpack build pass. New
  tests cover replay ordering, clearing, account/mode isolation, trusted prices,
  24-hour classification, returning activity, paid/processing exclusion without
  a browser return, declined/expired checkouts, retention, origin checks, limits,
  repeatable migration and best-effort reporting failures during checkout.
- Migration 004 was applied only to Neon `stripe-preview`. Before migration,
  after migration and after browser tests, all 10 `orders` rows matched checksum
  `0c9b72ff4e02baba98aaebccb6c97cd5`. No payment or fulfillment records were changed.
- Commit `6448a94` deployed Ready to Preview as
  `dpl_6m9FKBaBVvUdPkjwxVwAN7K7MFB2`. Authenticated browser checks confirmed a new
  anonymous New Beginnings cart at CA$65, quantity two at CA$130, and removal
  hiding the cart. The originally empty browser cart was restored to empty.
  No additional order or payment was created. Paid exclusion and 24-hour timing
  were verified in embedded PostgreSQL, rather than waiting or paying again.
- A follow-up records both item updates and tab visibility changes, including
  switching away before the debounce fires; only visible tabs send heartbeats.
  Browser writes time out after five seconds and cart database queries after
  three seconds. Reporting remains best-effort and never grants payment approval.

## Order cancellation — 2026-09-30

- Added manual **Cancelled** fulfillment status, a dedicated list/count, required
  reason in internal notes, and a permanent activity-note snapshot. Cancellation
  does not call Stripe, issue/confirm a refund, or change the payment record.
- All 68 tests, ESLint, TypeScript and the production webpack build pass. Tests
  cover upgrading the previous operational schema, required cancellation reasons,
  queue/count changes, reopening, stale edits, and original-order preservation.
- Migration 003 was applied only to Neon `stripe-preview`. Before/after checksums
  matched for all 10 orders (`0c9b72ff4e02baba98aaebccb6c97cd5`), fulfillment records
  (`8b2c246403478c1ad2a83f95aaa6ec7e`), and existing activity fields
  (`b683bef68fa6f157465d6656fe8510cc`, excluding the new empty note column).
- Commit `4b50839` deployed successfully to Preview as
  `dpl_HqBWDeoACXWgWXhRRREYAth4xVGD`. Browser testing confirmed the required-reason
  validation, saved cancellation after reload, queue/count changes, the cancelled
  list and reopening with the cancellation reason retained in activity.
- Test order `25e22760-0ed9-4de8-b5fc-94fcb201b921` was restored to **To pack**
  with its temporary note cleared. The owner's separate shipping test was left
  untouched. All 10 original order/payment rows still matched the checksum above
  after these browser tests. No refund was requested or issued.

## Owner portal — 2026-09-30

- 65 automated tests pass, including authentication, CSRF, throttling, pinned
  account/mode, fulfillment updates, concurrency and historical-order preservation.
- ESLint and TypeScript pass. Production webpack build passes; it required network
  access to download the existing Archivo Google font.
- Unauthenticated `/admin/orders` browser visit redirects to `/admin/login`.
- Migration 002 was applied only to Neon `stripe-preview`. All nine original
  orders matched checksum `c0aa3f2be91c4536c298d385a40e5fa4` before and after.
- Stripe sandbox **Successful payment receipt – Email** preference was enabled
  and verified checked for the owner account, whose email is
  `bornfromwatercanada@gmail.com`. Inbox delivery has not been verified.
- With the owner's approval, both admin credentials were stored as Vercel
  **Secret** variables scoped only to Preview branch `codex/stripe-migration`.
  Commit `99a4b69` was redeployed successfully as
  `dpl_6aa3GSB2SemYzBTSNfc7M58dEjzd`. Production access is unchanged.
- Authenticated browser verification passed on the stable preview: sign-in,
  sign-out, protected-route redirect after sign-out, paid-order list, packing,
  shipping, delivery, tracking link and customer address-line edits. Reloads
  confirmed persistence; activity entries appeared. Shipping without a carrier
  and tracking number/note was rejected with an actionable validation message.
- Sandbox order `25e22760-0ed9-4de8-b5fc-94fcb201b921` was restored to **To pack**
  with the temporary tracking, internal note and address-line edits cleared.
  Its verification activity remains. The dashboard now shows three paid test
  orders, including a subsequent owner checkout `404c6e42-ecba-4f94-abcd-0c391c6f2c25`.
- All six GoDaddy records are visible; opening a historical order showed a
  read-only view. After fulfillment tests, the original nine `orders` rows still
  matched checksum `c0aa3f2be91c4536c298d385a40e5fa4` (excluding only the subsequent
  owner checkout above). No original payment/order records were modified.

## Hosted preview setup — 2026-09-30

The GitHub branch `codex/stripe-migration` deployed through the existing Vercel
integration. Commit `8e4df78` was redeployed after configuring sandbox runtime
settings. Preview deployment: `dpl_5WRuJ1aJvazucv9NNhDNhBzPN9m2`.
The stable review URL is
[the Stripe preview](https://born-from-water-test-schem-git-2a150f-aseemasoni-7180s-projects.vercel.app/).

- Created Neon branch `stripe-preview` (`br-mute-frost-axxyl0ob`) from `production`
  in project `sparkling-frost-11144338`, database `bornfromwater`. Applied
  `001-stripe-checkout.sql` only to this copy. The six historical rows retained
  all original field values: their ordered JSON checksum before and after was
  `3817156a2dee396c87bc6fdfba86f279` (excluding newly added columns afterward).
- Added branch-specific Vercel secrets for the isolated database, restricted
  Stripe sandbox key, webhook signing secret, account, stable `APP_URL`, and
  explicit CA/free-shipping/no-tax/live-disabled settings. The existing Preview
  order signing secret is inherited. Production variables and database are unchanged.
- Created restricted key **Born From Water — Vercel Stripe Preview**, with
  Accounts Read and Checkout Sessions, Products, Prices, Shipping Rates Write.
- Registered **Born From Water — Stripe Preview** webhook
  `we_1ULVgtE3bgUZeCZrI6f4Exji`, own-account snapshot events, API
  `2026-08-26.dahlia`, for all four checkout event types. An approved Vercel
  automation bypass allows webhook delivery through deployment protection;
  its value and all other secrets remain outside this repository.
- The redeployment built successfully in Vercel. The application now opens
  Stripe-hosted checkout; the missing-configuration 503 is resolved.
- Cancelling and resuming reused the exact same Checkout Session. Stripe's
  insufficient-funds test card was declined with an actionable message.

The first app-created test Session:
`cs_test_a1aHOeoUtJQqMdwUTzSzmcgVdxGR38aMX7lSQ7UQb0e4HT2LRns71BpVvp`.
Order: `ebb8b2c0-c6d1-4f71-8532-4baee7320717`. This remains `open`, `unpaid`,
`livemode=false`, total 6500 CAD cents; browser approval review blocked a retry.

The owner completed a separate fresh checkout through the deployed app:
`cs_test_a1FJyxLg5tl0MX6R5G9qoPyJGgp8JiLVFqcTLxhKvXzXqCKGYdtilG8jhd`.
Stripe confirmed `complete`, `paid`, `livemode=false`, total 6500 CAD cents.
Neon stored order `5bd35ba8-1aa4-4f33-b518-2302dd49e1f9` as `approved`, with
`paid_total_cents=6500`. Event `evt_1ULW0OE3bgUZeCZrjr1QO8wx` delivered to the
deployed webhook with HTTP 200 and `{"received":true}` at 22:29:41 UTC. A manual
replay at 22:34:04 UTC also returned HTTP 200; the order remained approved.

After that payment, the owner requested Canada-only shipping at CA$10 per order.
The branch-specific `STRIPE_SHIPPING_CENTS` was changed to `1000`; countries remain
`CA`. This applies only to newly created checkouts. The existing paid order and
open Sessions retain their original shipping and totals.

Tax diagnosis: checkout automatic tax was disabled. The sandbox's Tax Settings
are `pending`, missing `head_office`, with no preset product tax code and no tax
registrations. The owner answered that registrations are unknown/unconfirmed.
Tax remains disabled until origin, product classification and registrations are
confirmed. Taxed payments and a payment completed without returning to the app
have not yet been verified in the hosted environment; local tests cover those
payment/status cases with simulated Stripe responses.

## Preview preparation — 2026-09-30

Git history was restored from `ranjansoni/bornfromwater` at the handoff's base
commit, `63b3eeba`, without replacing working files. The migration is on
`codex/stripe-migration` for review through the existing Vercel Preview integration.
The production branch and shared database were not changed.

The 50 tests, ESLint, and Webpack production build passed again. A clean locked
install repaired duplicated local dependency folders. The newly reported
`brace-expansion` advisories were resolved with compatible patches to the two
lint-tool dependencies; npm audit reports zero vulnerabilities. Turbopack remains
blocked by this local host's worker-port restriction.

Credentials, editor backups, build output, and generated handoff patches are
excluded from the preview commit. The original sitemap, AGENTS.md, and try-on
image remain byte-for-byte unchanged. Hosted sandbox payment testing still
requires verification of the Vercel Preview environment variables, sandbox
database, and deployed Stripe webhook described below.

## Completed locally

- Stripe-hosted Checkout redirect, immutable order/Session snapshots, account/mode
  binding, retry identity, expiry recovery and signed webhook processing.
- Status refresh with verified payment totals, explicit sandbox labels and cart
  clearing limited to the paid attempt and unchanged cart.
- Retired GoDaddy charge endpoint (410), removed active Poynt form/OAuth/payment
  code, historical signed links preserved through status, customer payment copy updated.
- Additive SQL migration and setup, fulfillment and cutover documentation.
- Original sitemap and `public/try-on/IMG_5913.JPEG` verified by SHA-256 unchanged.
  All historical database testing used synthetic data in isolated PGlite instances.
  No shared or production database was contacted or migrated.

## Checks and results

| Check | Result |
| --- | --- |
| `npm test` | **50 passed**, 0 failed |
| `npm run lint` | Passed |
| `npx tsc --noEmit` | Passed |
| `npm run build -- --webpack` | Passed, including static page generation and TypeScript |
| Default `npm run build` | Blocked by host restrictions: initial Google Font fetch, then Turbopack worker-port binding. Webpack fallback verified. |
| npm audit after targeted updates | 0 vulnerabilities |
| `npm ci --cache /private/tmp/bfw-npm-cache --fetch-retries=0` | Clean locked install passed |
| Migration on a synthetic historical schema, applied twice | Original order fields, status, currency, transaction ID and timestamps unchanged |

The test suite uses real embedded PostgreSQL, real Stripe SDK signature generation
and verification, and simulated Stripe API responses. It covers concurrency,
timeouts, association races, immutable parameters, wrong account/mode/currency/
amount, paid/unpaid/failure/expiry states, duplicates and out-of-order events,
legacy orders, signed tokens, trusted pricing, configuration and cart preservation.

Dependency maintenance was limited to compatible updates: Next.js, its third-party
package and ESLint config to 16.3.7; transitive sharp/js-yaml fixes. Added test-only
`tsx` and PGlite. The transferred lockfile's missing optional package records were
repaired. The package now declares ES modules, matching its TypeScript module
configuration and preventing duplicate error-class identities in the test runner.

## Browser and built-server checks

The built storefront was started locally on `127.0.0.1:3000` and checked using the
Codex in-app browser:

- Added New Beginnings Bracelet, viewed cart and the CAD subtotal, then checkout.
- Confirmed Stripe copy and readable desktop layout.
- Submitted and retried checkout with runtime credentials absent. The customer
  saw a safe error and both requests retained the same retry UUID.
- Changed quantity from 1 to 2. Checkout required review of the previous attempt
  rather than silently starting another payment.
- An invalid status token showed “We could not identify this order,” preserved
  the cart and displayed no payment approval.

HTTP checks against the production build also confirmed:

- `POST /api/checkout` with invalid input: 400.
- `POST /api/checkout/charge`: 410.
- `POST /api/webhooks/stripe` without runtime configuration: 503 (fails closed).
- Retired Poynt OAuth callback: 404.
- Historical `/checkout/pay?token=…` URL: 307 to status.

## Connected planner and sandbox verification

After Stripe was installed, account discovery independently confirmed
**Born From Water sandbox**, `acct_1UKmEIE3bgUZeCZr`, `livemode=false`. A fresh
implementation planner was accepted:
`iguide_61VUWyvr5ltqdiepb41E3bgUZeCZr`, hosted browser Checkout.

The first API contract check rejected `ui_mode: "hosted"`. This caught a real bug
that the mocked tests and SDK's extensible string type had not caught. Code now
uses `hosted_page`; the regression test checks that value. A stable
`integration_identifier` with a random eight-letter suffix was added as required
by Stripe's current integration guidance.

A new synthetic order's exact request parameters were captured from the production
`checkoutDestination` function and submitted through the authenticated Stripe
connector. Stripe created this sandbox Session:

`cs_test_a1CzsTZUcjzaJIUFpABJKYxFAvfScO0CYAfKWDpyD8M4gBJ8yfQvdMRrzW`

The hosted checkout displayed Born From Water sandbox, New Beginnings Bracelet,
CA$65.00, free Canadian shipping, no tax, and the optional sizing-note field.
Using Stripe's published Visa test card and synthetic contact/shipping details,
the browser completed the test payment. Server retrieval confirmed:

- `status=complete`, `payment_status=paid`, `livemode=false`.
- Subtotal and total both 6500 CAD cents; shipping/tax/discount all zero.
- Canadian shipping address and sizing note captured in the expected fields.

The real paid Session response then passed through production
`confirmStripeSession` and `recordStripePayment` against an isolated PGlite
Postgres database. It stored `approved`, the 6500 paid total, shipping and sizing
note. A duplicate replay remained approved, and a late expiry could not downgrade
it. Synthetic order ID: `8012af12-e133-4c2a-a8e1-50b8b3e916fd`.

This verifies the actual Stripe request/response contract and hosted payment UI.
**The Session was created through the connector, not the running app's HTTP
endpoint.** No application runtime key, Neon connection or webhook delivery was
substituted or simulated as connected end-to-end verification.

CSP and analytics isolation were added after the Stripe security review. The final
built server and browser checks passed with no console errors; status responses
include CSP and `no-referrer`, contain no Google Analytics loader, and fail safely
for invalid tokens. All 50 automated tests, lint, TypeScript and the Webpack
production build pass after the connected-test fixes. Clean `npm ci` passes and
reports zero vulnerabilities.

## Earlier connection limitations — 2026-09-29

The following limitations describe the earlier local verification, before the
hosted setup recorded above. At that time, no `.env.local`,
application restricted API key, webhook signing secret, order signing secret or
Neon sandbox database connection have been supplied. Consequently **the running
application's complete cart -> Stripe -> webhook -> status path remains unverified**.
No external webhook endpoint was registered and no remote database migration ran.
No live operations, deployment, push or commit occurred.

To finish: securely configure `.env.local` from `.env.example` with a restricted
key for the verified sandbox, a sandbox Neon database and signing secrets; apply
the additive migration to the backed-up sandbox database; configure the Stripe
CLI listener or hosted sandbox webhook; then run the app-runtime end-to-end checks
in [stripe-migration.md](stripe-migration.md), including browser-close/webhook-only
confirmation and cancellation/expiry/asynchronous failure. Shipping/tax answers
remain outstanding; Canada/free shipping/no automatic tax are sandbox assumptions
only. Preserve the historical signing secret when using historical data.
