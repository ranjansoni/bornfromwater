# Owner order portal

The private portal lives at `/admin`. The owner signs in with one shop password.
Orders enter the **To pack** queue only after Stripe payment is verified. The
workflow is **To pack → Packed → Shipped → Delivered**. The owner can correct
delivery contact details, add a carrier, tracking number/link, and internal notes.
Each successful save records an activity entry. Conflicting edits in another tab
are rejected so they cannot silently overwrite one another.

## Cart activity

Open **Carts** in the owner navigation (`/admin/carts`). **Recent** shows observed
carts active in the last 24 hours; **Potentially abandoned** shows carts inactive
for at least 24 hours. Cards show items, quantities, merchandise subtotal, first
and last activity, and a checkout link when one was started. Refresh to see updates.
Empty carts and matching paid or processing checkouts are excluded, even if the
shopper never returns from Stripe. A changed item selection can appear again.

This first version is anonymous reporting: it does not collect contact details,
email permission, or send reminders. Existing browser-only carts appear only if
the shopper returns after this update. There is no cross-device identity or
guarantee that an inactive cart is abandoned. Browser storage restrictions or
failed requests can prevent observations; shopping and payment still work.
Cart privacy is described on the cart and `/care#cart-privacy`.

The view covers 30 days of activity. Expired observations and their cart links are
pruned in batches on subsequent observation requests; there is no scheduled purge.
Order records are never deleted by this cleanup. Tokens are random per browser
cart and stored only as scoped HMAC hashes on the server. The public endpoint
accepts validated catalogue items and returns no cart data. Admin access, account
and sandbox/live separation remain enforced. No new credentials are needed.

To test, add an item in the preview shop, then open **Carts → Recent** and refresh.
Change its quantity and refresh again. Remove the item and confirm it disappears.
An untouched cart moves to **Potentially abandoned** after 24 hours.

## Cancelling an order and refunding a payment

Select **Cancelled**, add the cancellation reason to **Internal notes**, and
click **Cancel order**. This removes the order from active fulfillment queues;
it remains in **Cancelled** and **All paid orders**. The cancellation reason is
retained in activity history, including if the order is later reopened.

Cancellation does **not** issue or confirm a refund or send a customer email.
Use **View payment in Stripe** to issue a full or partial refund in Stripe and
check its result there. Stripe refunds do not automatically change fulfillment
status in this version. A partial refund need not cancel an order that will
still be shipped. If you reopen a cancelled order, check the payment/refund and
customer's wishes first; reopening does not charge the customer again.

Stripe's [refund documentation](https://docs.stripe.com/refunds) describes the
Dashboard refund steps and payment/refund status distinction.

This is a manual fulfillment tool. Saving an order does not buy postage, send a
customer email, change a payment, issue a refund, or reserve stock. Use the payment
link on the order to check Stripe for refunds or disputes before shipping. Refund
and dispute updates are not yet synchronized into the local payment record.

## Soft deletion and restoring orders

On a confirmed Stripe order, choose **Delete order → Confirm delete**. The order
is hidden from the default lists and counts, and fulfillment editing is disabled.
This only changes portal visibility: it does not cancel fulfillment, refund a
payment, delete Stripe data, erase customer details, or remove order history.
Use the separate cancellation workflow when a customer cancels a purchase.

Check **Show deleted orders** on the orders page to include hidden orders alongside
the others. Deleted rows are labelled. Status, search and pagination still apply;
the checkbox is preserved when changing these filters. Open the order and choose
**Restore order** to recover its previous fulfillment status, notes, tracking and
delivery details. Deleting and restoring both leave dated activity entries.
Historical GoDaddy orders and unpaid checkouts remain read-only.

Deletion uses the same version check as fulfillment edits, so an older tab cannot
silently overwrite a newer deletion or restore. A deleted order remains available
through its authenticated detail page; customer payment confirmation and webhook
processing still read the preserved original order. No permanent-delete operation
is exposed. Sandbox and live order lists remain isolated when launching.

## Paid-order email notifications

The owner chose Stripe's built-in notifications, sent to the Stripe user email
`bornfromwatercanada@gmail.com`. No additional email provider or app-generated
notification is used, so application webhook replays do not send duplicate emails.

In Stripe, open **Settings → Communication preferences → Transactions and
Balances → Successful payment receipt → Email**. This preference was enabled and
verified checked in **Born From Water sandbox** on 2026-09-30. Stripe states these
preferences apply only to the selected account. Enable the corresponding preference
in the live account as part of the separately authorized launch. Sandbox setting
verification does not prove inbox delivery; test emails can behave differently
from live payments. Abandoned or unpaid checkouts do not create a fulfillment job.

## Database setup

For an existing migrated Stripe database, run
`src/db/migrations/002-order-management.sql`, followed by
`src/db/migrations/003-order-cancellation.sql`. Migration 002 is repeatable and only adds
`order_fulfillment`, `order_fulfillment_events`, and `admin_login_limits` plus an
index. New databases can use `src/db/schema.sql` directly.
Migration 003 expands the fulfillment status constraint and adds an activity-note
snapshot, without modifying `orders` or existing operational records. Apply it
before deploying cancellation support.

Apply `src/db/migrations/004-cart-activity.sql` before deploying cart reporting.
It adds `cart_activity`, `cart_checkout_links`, and `cart_activity_limits` without
updating orders or fulfillment. It was applied only to `stripe-preview`; all 10
orders retained checksum `0c9b72ff4e02baba98aaebccb6c97cd5` before and after.

Apply `src/db/migrations/005-order-soft-delete.sql` before deploying soft deletion.
It adds nullable `order_fulfillment.deleted_at` and the activity `action` field,
defaulting previous entries to `updated`. It does not change the original orders,
fulfillment values or activity contents. Existing orders are visible by default.
Migration 005 was applied only to Neon `stripe-preview` on 2026-10-01. Original
order, fulfillment and activity checksums matched before/after. The deployed
delete/filter/restore flow was browser-tested; the test order was restored.

The migration was applied only to Neon `stripe-preview`
(`br-mute-frost-axxyl0ob`). Before and after, the complete nine-row `orders` table
had checksum `c0aa3f2be91c4536c298d385a40e5fa4` using
`md5(string_agg(to_jsonb(o)::text, '' ORDER BY order_id))`.

Fulfillment updates never write to `orders`. Original payment amounts, checkout
details and historical GoDaddy data remain unchanged. Historical GoDaddy orders
are visible in a read-only view. Stripe lists and updates are pinned to the
configured account and environment. Sandbox orders are clearly labelled.

## Private access setup

1. Run `npm run admin:credentials` once locally. It creates two gitignored files
   with owner-only filesystem permissions. Existing files are never overwritten.
2. Import `.env.admin.local` into Vercel as **Secret** environment variables,
   scoped to **Preview → codex/stripe-migration only**. It contains
   `ADMIN_PASSWORD_HASH` and `ADMIN_SESSION_SECRET`; it does not contain the
   plaintext password. Redeploy after changing environment values.
3. The owner password is in `admin-access.local.txt`. Save it in a password
   manager. Do not paste credentials in chat or commit these files.
4. Visit the stable preview URL at `/admin`. Sign out when finished.

The portal fails closed if its credentials are missing. Passwords use scrypt;
sessions use a separately keyed HMAC, expire after 12 hours, and are held in a
Secure, HttpOnly, SameSite cookie in production. Password-hash changes invalidate
existing sessions. Mutations require both authentication and an allowlisted Origin.
Admin pages/API responses are private and uncached, excluded from indexing, and
do not load storefront analytics. Login attempts are limited to 20 per 15 minutes
across the whole owner account, persistently in the database.

For deliberate rotation, securely remove the local generated files, rerun the
generator, replace both deployed values, and redeploy. Use separate credentials
for production; production access is not enabled by the preview setup.

Preview access was enabled on 2026-09-30 with the owner's approval. Sign-in,
fulfillment edits, tracking, contact corrections, history and sign-out were
verified against the isolated sandbox database. Use the local password file
above to sign in from another browser.

## Verification

Automated coverage includes password verification, tampered/expired sessions,
credential rotation, CSRF checks, unauthenticated writes, persistent throttling,
account/mode isolation, original-order preservation, historical read-only access,
status/tracking updates, unsafe tracking links, and concurrent-edit conflicts.
Browser verification and preview deployment results are recorded in
`stripe-verification.md`.

## Product catalogue

`/admin/products` lists all nine migrated products, with search and Active,
Disabled and Coming soon filters. The owner can edit the name, CAD price, collection,
stone label, short description, description, meaning, story and display order.
Save applies to the current environment immediately; no redeployment is needed.
Existing image galleries, SKUs and URLs are retained. This version edits existing
products; image uploads and creating new products are not included.

- Active products appear in the shop and can be bought.
- Coming soon products remain visible but cannot start a new checkout.
- Disabled products disappear from listings, related products, sitemap and direct
  public product pages. Items already in a browser cart are labelled unavailable.
- New checkouts use database prices, never browser-submitted amounts. If a displayed
  price changed, the buyer must review the refreshed cart before starting payment.
- Existing orders and already-started checkouts retain their saved name, SKU and
  price. Disabling a product does not cancel an existing Stripe Checkout Session.
- Saves use the existing owner session and origin checks, detect conflicting editor
  versions, and retain an audit snapshot. Text remains plain text; JSON-LD escapes
  script delimiters. Original order/payment tables are not edited.

Apply `src/db/migrations/006-product-catalog.sql` to each isolated database before
its application code is deployed. It imports current product data and photo paths
only when the product does not already exist, preserving owner edits on reruns.
Runtime never falls back to the old JSON catalogue if the database is unavailable.
The JSON files and `catalog-seed.ts` are migration/test fixtures only.

The catalogue is isolated by database: changes on the sandbox preview do not change
production or the prepared live-payment preview. At cutover, explicitly transfer
approved catalogue edits as well as preserving and reconciling order history.
