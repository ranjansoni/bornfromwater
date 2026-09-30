BEGIN;
-- Additive migration: historical Poynt records remain identifiable and unchanged.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'godaddy';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_account_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_session_id text UNIQUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text UNIQUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_livemode boolean;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_checkout_params jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_total_cents integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cents integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_cents integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_details jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_note text;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending', 'processing', 'approved', 'declined', 'expired'));
COMMIT;
