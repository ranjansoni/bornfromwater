CREATE TABLE IF NOT EXISTS orders (
  order_id uuid PRIMARY KEY,
  validated_cart jsonb NOT NULL,
  total_cents integer NOT NULL CHECK (total_cents > 0),
  currency char(3) NOT NULL DEFAULT 'CAD' CHECK (currency IN ('CAD', 'USD')),
  payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'processing', 'approved', 'declined', 'expired')),
  checkout_request_id uuid NOT NULL UNIQUE,
  godaddy_transaction_id text UNIQUE,
  payment_provider text NOT NULL DEFAULT 'godaddy',
  stripe_account_id text,
  stripe_session_id text UNIQUE,
  stripe_payment_intent_id text UNIQUE,
  stripe_livemode boolean,
  stripe_checkout_params jsonb,
  paid_total_cents integer,
  shipping_cents integer,
  tax_cents integer,
  customer_email text,
  shipping_details jsonb,
  order_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_fulfillment (
  order_id uuid PRIMARY KEY REFERENCES orders(order_id),
  status text NOT NULL DEFAULT 'unfulfilled' CHECK (status IN ('unfulfilled', 'packed', 'shipped', 'delivered', 'cancelled')),
  carrier text NOT NULL DEFAULT '',
  tracking_number text NOT NULL DEFAULT '',
  tracking_url text NOT NULL DEFAULT '',
  customer_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  internal_note text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS order_fulfillment_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(order_id),
  status text NOT NULL,
  carrier text NOT NULL,
  tracking_number text NOT NULL,
  internal_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fulfillment_events_order_idx ON order_fulfillment_events (order_id, id DESC);
CREATE TABLE IF NOT EXISTS admin_login_limits (
  bucket text PRIMARY KEY,
  attempts integer NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now()
);
