# Stripe Checkout migration

This migration uses Stripe-hosted Checkout Sessions for one-time CAD payments.
All operations must remain in **Born From Water sandbox** until business shipping
and tax settings and the launch steps below are approved and verified.

## Planner and account connection

A fresh implementation planner was run and accepted on 2026-09-29 for
**Born From Water sandbox**, account `acct_1UKmEIE3bgUZeCZr`, `livemode=false`.
The accepted decision path is:
`no_stripe_only -> in_browser -> no_digital_managed -> no_invoice -> no_payment_links -> out_of_box_hosted`.
The integration shape is hosted browser Checkout (`provider=checkout_studio`).
Planner guide: `iguide_61VUWyvr5ltqdiepb41E3bgUZeCZr` (historical reference only;
start a fresh guide in another conversation).

Connected testing caught the retired `ui_mode: "hosted"` request value. The current
Stripe API and SDK use **`ui_mode: "hosted_page"`**. Session creation now uses that
value and the stable integration label `bornfromwater_hosted_djhyjqve`. A real
CA$65 sandbox Checkout payment succeeded with these production request parameters;
see [the verification report](stripe-verification.md) for scope and remaining gaps.

Configure `STRIPE_ACCOUNT_ID=acct_1UKmEIE3bgUZeCZr` for this sandbox.
The runtime retrieves the current account for the configured API key and refuses
a different account. Each new order stores that account and its test/live mode;
a different key for the same account works, but changing accounts never silently
recreates an old order. Existing Stripe rows without an account ID require manual
reconciliation and confirmed association; do not backfill from guesswork.

## Local setup

1. Run `npm ci` with Node 22.
2. Create a Neon sandbox database/branch. Use `src/db/schema.sql` only for a fresh
   database. For an existing orders table use the migration instructions below.
3. Copy `.env.example` to `.env.local` and securely configure `DATABASE_URL`,
   `STRIPE_SECRET_KEY` (prefer a restricted test key, `rk_test_…`),
   `STRIPE_ACCOUNT_ID`, `ORDER_SIGNING_SECRET`, and `APP_URL`.
4. With the Stripe CLI authenticated to the same sandbox, run:

   ```bash
   stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired --forward-to localhost:3000/api/webhooks/stripe
   ```

   Put the listener's signing secret in `STRIPE_WEBHOOK_SECRET`, then start or
   restart `npm run dev`. Do not copy keys or signing secrets into chat, logs or Git.
   For a hosted sandbox preview, register the same four snapshot events at
   `https://<preview-host>/api/webhooks/stripe`, using the account's own events.
   Use the SDK's API version, currently `2026-08-26.dahlia`.
5. Configure shipping countries (comma-separated country codes), shipping in CAD
   cents, and `STRIPE_AUTOMATIC_TAX=true|false`. The owner confirmed Canada-only
   shipping at CA$10 per order on 2026-09-30: set `STRIPE_SHIPPING_COUNTRIES=CA`
   and `STRIPE_SHIPPING_CENTS=1000`. Tax remains disabled while registrations
   are unconfirmed. Automatic tax requires corresponding Stripe Tax configuration.

Use a separate restricted key for this application and environment. Grant only
permissions needed for creating/retrieving Checkout Sessions (including inline
prices/products/shipping rates) and retrieving the current account. Confirm the
exact permission scopes in sandbox by checking Stripe request logs; do not broaden
permissions merely to suppress errors. In deployment, store the key and webhook
secret in a secrets vault or Vercel sensitive environment variables. Never commit
credentials or send them through chat. See [restricted API keys](https://docs.stripe.com/keys/restricted-api-keys).

No client Stripe SDK or public API key is required. The browser sends only a cart
and retry UUID; the server owns prices, credentials, Session creation and validation.

## Configured Vercel preview

The existing GitHub integration deploys `codex/stripe-migration` to
[`born-from-water-test-schema` Preview](https://born-from-water-test-schem-git-2a150f-aseemasoni-7180s-projects.vercel.app/).
Use this stable branch URL for review and testing; older immutable deployment
URLs retain their earlier environment configuration.

Stripe runtime variables and `DATABASE_URL` are scoped to this branch. The
database is Neon `stripe-preview`, copied from production and migrated separately.
The existing Preview `ORDER_SIGNING_SECRET` remains in use. The registered sandbox
webhook sends the four checkout events to this branch's `/api/webhooks/stripe`.
Vercel deployment protection remains enabled; Stripe's endpoint configuration
includes the separately approved automation bypass. Treat that endpoint's query
value as a secret and never paste the full URL into tickets, chat or source code.

For a successful browser test, add an item, continue to Stripe, and use test
card `4242 4242 4242 4242`, any future expiry and a three-digit CVC. Use synthetic
Canadian address/contact information. The checkout must say **Sandbox**; the
confirmation page must identify the order as a sandbox test. New checkouts use
Canada-only shipping at CA$10 per order. The earlier CA$65 test used free shipping;
existing Checkout Sessions retain their original amounts and are not repriced.

Tax was intentionally disabled during initial sandbox setup. A 2026-09-30 account
check found Tax Settings `pending` (missing head office), no preset product tax
code and no tax registrations. The owner is not registered or is unsure of the
business's registration status. Keep `STRIPE_AUTOMATIC_TAX=false` until this is
resolved. Confirm the shipping-origin address, appropriate jewellery tax code,
and applicable GST/HST/provincial registrations; configure them in the sandbox,
then enable automatic tax and verify a calculation. Merely enabling the flag
without active registrations can still produce zero tax. Record confirmed live
registrations separately before launch; sandbox registrations do not carry over.

## Existing database migration and cutover

Back up the database first and inventory orders by provider and payment status.
Rehearse on an isolated branch/copy using:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f src/db/migrations/001-stripe-checkout.sql
```

The transaction adds Stripe fields and the `expired` status. It does not delete
rows, overwrite carts or totals, remove `godaddy_transaction_id`, alter currencies,
or relabel existing GoDaddy payments as Stripe. Reapplying it is safe. Verify row
counts and historical IDs, cart snapshots, totals, statuses, transaction IDs and
timestamps against the backup before cutover. `schema.sql` is not an upgrade tool.

Pause checkout during the final cutover so old Poynt instances cannot start new
charges while the new app is being enabled. Reconcile existing processing GoDaddy
orders with the previous provider; never reset or clone an uncertain order into a
new payment. Preserve the original signing secret so historical signed links work.
Old `/checkout/pay?token=…` links forward to status and `/api/checkout/charge`
returns 410. Poynt OAuth routes and the browser card form have been removed.

Retain the migrated schema even if an application rollback is required. Do not
restore the old charge path while unreconciled Stripe orders exist. Historical
code remains in Git history, the original ZIP and handoff diff. Git history was
restored without replacing the transferred files. The unrelated sitemap and
try-on assets are preserved.

## Payment lifecycle and recovery

- One retry UUID inserts at most one order. The original saved cart, prices,
  currency, account and mode are immutable for that attempt, even after catalogue
  changes. The browser keeps the preexisting attempt-storage key for old tabs.
- Exact Stripe creation parameters are frozen in Postgres before the API call.
  Concurrent requests and timeout retries share `bfw-checkout-<order ID>` and the
  same parameters. A returned Session is associated atomically.
- Cancellation returns to checkout and reuses the open Session. Changing the
  browser cart does not silently create a replacement attempt; the customer can
  review the previous checkout. The old attempt resolves before a fresh one starts.
- Missing Sessions on attempts at least 23 hours old require manual reconciliation.
  Never clear their retry UUID, swap credentials, or create a new Session to fix an
  uncertain charge. Locate the original Session in Stripe using `metadata.order_id`
  and `client_reference_id`; verify its account, mode, cart and outcome first.
- A confirmed expired Session or failed asynchronous payment permits a fresh
  checkout through the explicit “Start a new checkout” action. A processing payment
  does not. Pending historical orders go to status/contact, never a new Stripe charge.
- Webhooks verify the raw body signature, mode, account, Session/order identity,
  currency and subtotal. Payment approval additionally verifies paid/complete status,
  payment intent, shipping, tax, no discount, and the actual total. A current Session
  is retrieved through the pinned account. Unpaid completions remain processing.
- Atomic database writes tolerate duplicate and out-of-order events. Paid orders
  cannot be downgraded. Database/association failures return 503 for Stripe to retry;
  signature and validation mismatches return 400. Monitor non-2xx deliveries and
  investigate mismatches; do not bypass validation to suppress retries.
- Status-page refresh uses the same verification and displays the actual paid total.
  A failed refresh shows the saved status and a retry message. Only verified approved
  orders clear a matching browser cart, after its initial storage load. New selections
  and other checkout attempts remain untouched.

The app sends a Content Security Policy for all routes. Checkout routes also use
`Referrer-Policy: no-referrer`, omit the analytics component, and disallow analytics
network destinations so signed order links are not sent to analytics. The policy
allows inline bootstrap scripts/styles required by prerendered Next.js pages;
`unsafe-eval` is allowed only in development. Hosted Stripe navigation uses its own
page and policy. See [Stripe integration security](https://docs.stripe.com/security/guide).

## Fulfillment

Only fulfill orders with `payment_provider='stripe'`, `stripe_livemode=true`, and
`payment_status='approved'`, confirmed against the expected production account.
Sandbox orders (and historical USD test orders) are explicitly marked and must not
be shipped. The order stores `validated_cart`, `paid_total_cents`, `shipping_cents`,
`tax_cents`, `customer_email`, `shipping_details`, `order_note`, and the payment
intent ID. Use these saved records for packing and customer contact.

Fulfillment is manual: webhook replays do not send email or trigger shipping.
Record shipments once in the business's fulfillment system, keyed by order ID.
No automatic refund, inventory reservation, receipt email or shipping-label service
is implemented. Configure Stripe's payment receipts separately if desired. Handle
refunds and disputes in Stripe and reconcile the fulfillment record; this app does
not currently ingest refund/dispute events.

## Verification and launch gate

Local tests exercise real PostgreSQL SQL (PGlite), the repeatable additive migration,
Stripe SDK signatures, cart/price validation, concurrent attempts, lost responses,
association races, duplicate/stale events, failed/unpaid/paid flows, wrong account,
mode/currency/amount, token tampering, expiry, cancellation, historical orders and
cart preservation. Stripe API responses are simulated in these tests.

Before launch, complete a real sandbox cart -> Stripe -> status payment using
Stripe's documented test card, verify the database total/delivery details and the
webhook delivery result, retry a webhook, test cancellation, a decline, expiry and
an asynchronous failure when enabled. Confirm that a payment succeeds even when
the browser is closed before returning (webhook-only confirmation).

Only after those checks: confirm countries, shipping fee, tax behavior, inventory
and fulfillment policy; obtain explicit live/deployment authorization; configure
live account/key and webhook, HTTPS `APP_URL`, explicit shipping/tax values and
`STRIPE_ALLOW_LIVE=true`; deploy and verify the real production webhook. Live keys
are rejected on Vercel preview/development. Keep sandbox and live databases separate.

Current verification results and outstanding connection work are recorded in
`stripe-verification.md`.

## Official references

- [Stripe-hosted Checkout](https://docs.stripe.com/payments/accept-a-payment?payment-ui=checkout&ui=stripe-hosted)
- [Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment)
- [Webhook signatures and delivery](https://docs.stripe.com/webhooks)
- [Stripe testing](https://docs.stripe.com/testing)
