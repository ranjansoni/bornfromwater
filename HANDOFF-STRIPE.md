> **Continuation status (2026-09-30):** Implementation and local verification are complete (50 tests). `codex/stripe-migration` is pushed to GitHub and deployed to Vercel Preview. Branch-specific Stripe sandbox credentials, an isolated Neon `stripe-preview` database, and the four signed checkout webhooks are configured. All six copied historical orders passed a before/after preservation checksum. The owner's CA$65 app-runtime test payment is confirmed paid in Stripe and approved in Neon; the webhook and duplicate replay returned HTTP 200. Cancellation reuses the Session and the insufficient-funds test card declines correctly. Shipping is now confirmed as Canada only, CA$10 flat per order for new checkouts. Tax stays disabled: sandbox Tax Settings and registrations are missing, and the owner is unsure of registration status. See [the verification report](docs/stripe-verification.md) and [current setup instructions](docs/stripe-migration.md). The original handoff is retained below for history.

> **Owner portal (2026-09-30):** Private `/admin` order management is deployed and browser-tested with packing/shipping/delivery/cancellation status, tracking, delivery-contact corrections and activity history. All 68 tests, lint, TypeScript and the production webpack build pass. Migrations 002 and 003 are applied only to Neon `stripe-preview`; all 10 order/payment rows passed the preservation checksum. Cancellation requires a reason and preserves it in activity; refunds remain separate actions in Stripe and are not synchronized. The owner chose Stripe payment notifications for `bornfromwatercanada@gmail.com`; its sandbox email preference is enabled. See [owner portal setup](docs/order-management.md) for credentials, deployment and limitations.

# Born From Water — Stripe migration handoff

> **Dynamic catalogue (2026-10-01):** The owner prioritized product management before finishing live-payment setup. All nine products now come from Neon and are editable at `/admin/products` on the existing sandbox preview, with prices, wording, stories, collection, ordering and Active/Coming soon/Disabled availability. Existing photographs, URLs, SKUs and historical order snapshots are preserved. Migration 006 ran only on `stripe-preview`; the original 10 orders still match checksum `0c9b72ff4e02baba98aaebccb6c97cd5`. All 95 tests, lint, TypeScript and webpack build pass. Hosted testing verified edits, disabling/restoring, search, and Stripe receiving CA$72.35 + CA$10 shipping. Product values were restored; no payment was submitted. See the verification report. The separately prepared live branch `codex/stripe-live-preview` at `535c4ea` remains preserved with its access approvals pending. Merge this catalogue work into that branch and apply migration 006 to its separate database before resuming live setup. Production remains unchanged.

> **Soft deletion (2026-10-01):** Confirmed Stripe orders can be hidden with Delete order, included with Show deleted orders, and restored with their fulfillment details intact. Historical GoDaddy/unpaid records remain read-only. Deletion/restoration is authenticated, origin-checked, version-protected and audited; original orders/payments are untouched. Migration 005 adds operational metadata only. All 86 tests, lint, TypeScript and webpack build pass. See the verification report for hosted checks.

> **Cart reporting (2026-09-30):** Anonymous `/admin/carts` reporting is implemented with recent/24-hour inactive views, 30-day observation window, checkout links and exclusion of matching paid/processing carts. No contact capture or reminder emails. All 79 tests, lint, TypeScript and webpack production build pass. Migration 004 is applied only to Neon `stripe-preview`; all 10 order rows retain checksum `0c9b72ff4e02baba98aaebccb6c97cd5`. See the verification report for deployment/browser verification status.

Prepared 2026-09-29. This is an **unfinished working snapshot**, not a deployable release.

## Start here

The owner asked to replace GoDaddy Poynt payments with Stripe everywhere and keep the integration simple. They explicitly requested Stripe's implementation planner. They are transferring the work to their husband's Codex account.

Repository: https://github.com/ranjansoni/bornfromwater
Original workspace: C:\Codex\Bornfromwater
Current branch: codex/godaddy-poynt-checkout
Base commit: 63b3eeba1f50a8791cc40863636ab7d799eb04c1
Changes in this package are uncommitted and have NOT been pushed or deployed.

To continue with Git history, clone the repository (repository access may be required), check out the base commit, create a new codex/stripe-migration branch, then overlay the project files in this ZIP onto the clone. Do not overwrite a checkout containing someone else's work. Alternatively, open the extracted folder as a standalone project, but it has no Git history. Run npm ci.

Read AGENTS.md first. It requires reading relevant documentation from node_modules/next/dist/docs/ BEFORE writing Next.js code. The project uses Next.js 16.3.1, React 19.2.8, TypeScript, Tailwind 4, and Neon Postgres. Existing README describes GoDaddy; its payment setup is stale during this migration.

## Decisions and authorization

- Business: Born From Water, https://www.bornfromwater.ca/, Canadian handmade physical gemstone bracelets.
- One-time CAD purchases through an existing browser cart and local product catalogue.
- Replace GoDaddy entirely; not a multiprocessor integration.
- Stripe-hosted Checkout selected for simplicity; no need for embedded Elements or a client Stripe SDK.
- User explicitly selected **Born From Water sandbox**, test mode.
- Connected Stripe account identifier: acct_1UKmEIE3bgUZeCZr (an identifier, not an API key).
- No live Stripe operations were performed.
- Shipping destinations, shipping fee and tax settings were asked about but are UNANSWERED.
- Current code defaults to CA / zero shipping / no automatic tax for sandbox ONLY. These are assumptions for testing, not an approved business policy. Live mode requires explicit settings.
- Do not paste API secret keys into chat; put credentials into local/deployment environment configuration.
- No deployment or database migration has been run.

## Stripe planner result

The official Stripe plugin is installed and authenticated in the original user's Codex environment. This does NOT transfer authentication or account access to another Codex account.

Tools successfully used:
1. list_available_accounts_or_orgs
2. stripe_implementation_planner with business context
3. stripe_implementation_planner acceptance

Accepted decision path:
no_stripe_only -> in_browser -> no_digital_managed -> no_invoice ->
no_payment_links -> out_of_box_hosted

Accepted integration shape: checkout_type=hosted, origin_context=web, provider=checkout_studio.
The intended code integration uses Stripe Checkout Sessions with a redirect.
Do not reuse the previous session's planner guide ID: start a fresh planner call if needed.

Official references:
- https://docs.stripe.com/payments/accept-a-payment?payment-ui=checkout&ui=stripe-hosted
- https://docs.stripe.com/checkout/quickstart
- https://docs.stripe.com/checkout/fulfillment
- https://docs.stripe.com/payments/checkout/custom-components
Use current Stripe docs and the installed SDK types; avoid relying on older API examples.

## What has been changed

1. Installed stripe ^22.6.2 and server-only ^0.0.1; package.json and lockfile updated.
2. src/lib/stripe-config.ts added:
   - validates server secret key and fixed APP_URL (avoids trusting a request Host header);
   - derives test/live mode, rejects live keys on Vercel preview/development;
   - shipping countries/fee/tax configuration, with live configuration requirements.
3. src/lib/stripe.ts added: server-only SDK factory, retries and timeout.
4. src/lib/checkout-service.ts REPLACED:
   - verifies Session ID, local order metadata, provider, mode, currency, subtotal;
   - confirms paid/complete status and totals, shipping, tax, zero discount;
   - extracts payment intent, email, shipping address, sizing note;
   - guards against recreating an ambiguous checkout past Stripe's idempotency window.
5. src/lib/order-store.ts partially migrated:
   - new Stripe fields in stored orders;
   - new createPendingOrder fourth argument (livemode);
   - immutable session-creation parameter snapshot in DB;
   - atomic Session association and replay-safe paid/status updates;
   - old GoDaddy mutation functions removed; old callers have NOT been updated yet.
6. src/lib/stripe-checkout.ts added:
   - constructs hosted Checkout Sessions using server catalogue prices;
   - freezes request parameters before calling Stripe and uses an order-specific idempotency key;
   - reuses existing Sessions; refuses ambiguous attempts older than 23h;
   - supports expired sessions and completed sessions;
   - collects email, billing/shipping address, optional bracelet sizing/order note;
   - separates merchandise subtotal from shipping/tax;
   - success URL uses an HMAC-signed order token;
   - uses adaptive_pricing=false to keep CAD.
7. src/db/schema.sql updated for new installs.
8. src/db/migrations/001-stripe-checkout.sql added for existing databases:
   - additive Stripe columns, keeps godaddy_transaction_id and historical orders;
   - labels preexisting records godaddy;
   - adds expired payment status.
9. src/lib/payment-currency.ts changed so new payments always use CAD, retiring Poynt's preview USD experiment. USD type retained for historical records.

All of this is unverified implementation work and needs review. It is not a finished integration.

## Work still required (recommended order)

1. Complete POST /api/checkout in src/app/api/checkout/route.ts:
   - validate request/cart from server catalogue, not caller-provided prices;
   - validate configuration before creating an order;
   - pass test/live mode to createPendingOrder;
   - call checkoutDestination and return its destination;
   - preserve retry identity; handle CheckoutExpiredError with an explicit safe fresh-attempt response;
   - give safe customer-facing errors without exposing secrets or internal Stripe details.
   - Handle an old browser checkout attempt that points to a historical GoDaddy order without converting or double-charging it.

2. Implement src/app/api/webhooks/stripe/route.ts.
   The directory exists but **the route file was not created** (patch stopped at a directory-creation error).
   Intended behavior:
   - Node.js runtime; read raw request.text();
   - verify stripe-signature using STRIPE_WEBHOOK_SECRET via SDK constructEvent;
   - reject invalid signatures and mismatched mode;
   - handle checkout.session.completed, checkout.session.async_payment_succeeded,
     checkout.session.async_payment_failed, checkout.session.expired;
   - ignore unrelated Sessions without this app's order metadata;
   - load and verify the matching persisted order/Session, use verifiedPayment and atomic DB updates;
   - completed but unpaid must remain processing; only verified paid means approved;
   - late failure/expiry events must never downgrade approved orders;
   - return 5xx on transient DB failures or Session-association races so Stripe retries.
   No webhook endpoint was registered in Stripe.

3. Update CartView.tsx:
   - redirect to returned Stripe URL using full-page navigation;
   - preserve/reuse checkout attempt ID during retries and cancel/return;
   - provide expired-checkout recovery without creating another attempt for ambiguous processing payments;
   - replace technical/customer copy with clear Stripe payment copy;
   - consider migrating the sessionStorage attempt key version from GoDaddy.

4. Replace /checkout/pay and PoyntCardForm; disable/remove the old /api/checkout/charge route and any obsolete Poynt runtime/OAuth routes.
   Preserve historical paid-order status. For ambiguous processing GoDaddy orders, do not create a second charge.
   GoDaddy implementation remains in Git history, so an active duplicate payment path is unnecessary.

5. Update /checkout/status:
   - keep signed-token verification;
   - optionally retrieve the stored Session directly from Stripe and call the same verified confirmation logic;
   - a URL visit alone must never mark an order paid;
   - clear cart only after verified approval (ideally only the relevant checkout attempt);
   - show actual paid total including shipping/tax;
   - distinguish sandbox from live orders;
   - handle processing, failure, expiry and refreshed status without false success.
   Current status page still names GoDaddy and formats merchandise total.

6. Replace customer-facing GoDaddy references in care/page.tsx and shop/[slug]/page.tsx.
   Update products.ts SKU comment. Update .env.example and README.
   Document setup, migration, sandbox defaults, fulfillment workflow and cutover in docs.

7. Review implementation edge cases before shipping:
   - multiple/concurrent requests use the same Session and stored parameters;
   - avoid second payments after ambiguous timeouts or idempotency expiry;
   - webhook duplicates / out-of-order events / race before DB association;
   - signed order tokens, expected amount/currency/mode;
   - catalogue changes and existing-order snapshots;
   - explicit shipping/tax settings and customer delivery details;
   - approved historical GoDaddy orders remain readable;
   - Stripe account/key changes must not mix existing orders across accounts.

8. Replace old checkout-service and currency tests with meaningful Stripe tests.
   Test invalid webhook signatures, unpaid completed Sessions, amount/currency/order/mode mismatch,
   duplicate/out-of-order events, checkout retries, expired and cancelled flows, DB failures and historical orders.

9. Run npm test, npm run lint, npm run build. Browser-check cart -> checkout -> Stripe -> status.
   A real sandbox end-to-end payment also requires API credentials, migrated DB and webhook delivery.

10. Only after sandbox verification, configure live credentials and shipping/tax, register production
    webhook and deploy under the user's deployment instructions. Do not claim live readiness before this.

## Current verification status (run for this handoff)

npx tsc --noEmit: FAILED, with these known unfinished-migration errors:
- src/app/api/checkout/charge/route.ts references removed DuplicatePaymentError,
  InvalidOrderAmountError, processOrderPayment, claimOrderForPayment,
  markOrderApproved, markOrderDeclined; also catch variable typing error.
- src/app/api/checkout/route.ts calls createPendingOrder with 3 arguments instead of 4.
- src/lib/godaddy.ts imports the removed GatewayResult type.

npm test: FAILED. 10 Poynt diagnostics/OAuth tests passed; two test files fail to load:
- tests/checkout-service.test.mjs imports removed GoDaddy service exports.
- tests/payment-currency.test.mjs imports removed GoDaddy service exports.
Node also emitted a Windows async-handle assertion during that failing test run.

No completed build, lint run, browser test, or Stripe payment test has occurred.
npm install reported 3 audit findings (2 high, 1 critical); they were not investigated.
Do not blindly run npm audit fix --force during this migration.

## Environment / secrets

The original workspace has .env.publish.local containing DATABASE_URL.
It is intentionally EXCLUDED from this ZIP.
.env.example is included but still contains the old GoDaddy variable list.
No Stripe secret key, webhook signing secret, or order signing secret was configured locally.
Do not assume MCP authentication provides runtime application API keys.

Expected runtime configuration after finishing:
- DATABASE_URL
- STRIPE_SECRET_KEY (sandbox first)
- STRIPE_WEBHOOK_SECRET
- ORDER_SIGNING_SECRET (random, at least 32 characters)
- APP_URL
- STRIPE_SHIPPING_COUNTRIES (comma-separated)
- STRIPE_SHIPPING_CENTS (integer CAD cents)
- STRIPE_AUTOMATIC_TAX (true/false)

Stripe secrets and the database connection must be supplied securely on the new machine.
Coordinate any shared database changes so active orders are preserved.

## Existing unrelated user work — preserve

Before this task began, src/app/sitemap.ts was already modified and public/try-on/ was untracked.
Both are included in this source snapshot. Do not delete or revert them as migration cleanup.
No other agent is working on this task. The original agent paused implementation to make this handoff.

## ZIP contents

Full current project source and public assets, package/lock files, AGENTS.md, docs, tests,
this handoff and a Git diff of tracked changes. No node_modules, .next, .git, credentials,
private .env files, logs, caches or Codex authentication data.
The tracked diff does not include newly added files; the ZIP DOES include those files.
The source snapshot is the authoritative transfer artifact.

## Paste this into the next Codex chat

Continue the Born From Water GoDaddy-to-Stripe migration from the attached/extracted project snapshot.
Read HANDOFF-STRIPE.md and AGENTS.md first. The code is intentionally mid-migration and currently
does not type-check; do not deploy it yet. Use the official Stripe implementation planner with a
fresh guide, reconnect Stripe if necessary, and use Born From Water sandbox/test mode.
Finish all checkout routes, Stripe webhooks, order status, removal of active Poynt payment paths,
customer copy, environment/docs, tests and browser verification. Preserve historical GoDaddy orders
and the unrelated sitemap/try-on work. Keep one-time payments in CAD and use Stripe-hosted Checkout.
Shipping/tax requirements and runtime API credentials are still outstanding; finish independent code
work while obtaining those details. Never paste secret keys into chat. Report precisely what was
tested and anything still needed before launch.
