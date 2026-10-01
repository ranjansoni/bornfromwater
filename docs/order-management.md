# Owner order portal

The private portal lives at `/admin`. The owner signs in with one shop password.
Orders enter the **To pack** queue only after Stripe payment is verified. The
workflow is **To pack → Packed → Shipped → Delivered**. The owner can correct
delivery contact details, add a carrier, tracking number/link, and internal notes.
Each successful save records an activity entry. Conflicting edits in another tab
are rejected so they cannot silently overwrite one another.

This is a manual fulfillment tool. Saving an order does not buy postage, send a
customer email, change a payment, issue a refund, or reserve stock. Use the payment
link on the order to check Stripe for refunds or disputes before shipping. Refund
and dispute updates are not yet synchronized into the local payment record.

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
`src/db/migrations/002-order-management.sql`. It is repeatable and only adds
`order_fulfillment`, `order_fulfillment_events`, and `admin_login_limits` plus an
index. New databases can use `src/db/schema.sql` directly.

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
