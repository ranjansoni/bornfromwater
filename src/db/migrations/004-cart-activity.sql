-- Anonymous cart observations are separate from orders and payment history.
CREATE TABLE IF NOT EXISTS cart_activity (
  cart_id text PRIMARY KEY CHECK (length(cart_id) = 64),
  stripe_account_id text NOT NULL,
  stripe_livemode boolean NOT NULL,
  items jsonb NOT NULL CHECK (jsonb_typeof(items) = 'array'),
  subtotal_cents integer NOT NULL CHECK (subtotal_cents >= 0),
  fingerprint text NOT NULL,
  revision bigint NOT NULL CHECK (revision > 0),
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_activity timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cart_activity_scope_idx ON cart_activity (stripe_account_id, stripe_livemode, last_activity DESC);
CREATE TABLE IF NOT EXISTS cart_checkout_links (
  cart_id text NOT NULL REFERENCES cart_activity(cart_id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(order_id),
  fingerprint text NOT NULL,
  PRIMARY KEY (cart_id, order_id)
);
CREATE TABLE IF NOT EXISTS cart_activity_limits (
  bucket text PRIMARY KEY,
  attempts integer NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now()
);
