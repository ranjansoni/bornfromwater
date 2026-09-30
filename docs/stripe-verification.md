# Stripe migration verification — 2026-09-29

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

Current app-created test Session:
`cs_test_a1aHOeoUtJQqMdwUTzSzmcgVdxGR38aMX7lSQ7UQb0e4HT2LRns71BpVvp`.
Order: `ebb8b2c0-c6d1-4f71-8532-4baee7320717`. The last API check showed
`open`, `unpaid`, `livemode=false`, total 6500 CAD cents. Successful payment,
webhook delivery and the deployed confirmation page are awaiting the prepared
test payment; browser automatic approval review blocked the agent's retry.

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
