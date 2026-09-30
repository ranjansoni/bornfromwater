-- Separate operational records leave the original orders/payment history untouched.
CREATE TABLE IF NOT EXISTS order_fulfillment (
  order_id uuid PRIMARY KEY REFERENCES orders(order_id),
  status text NOT NULL DEFAULT 'unfulfilled' CHECK (status IN ('unfulfilled', 'packed', 'shipped', 'delivered')),
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
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fulfillment_events_order_idx ON order_fulfillment_events (order_id, id DESC);

-- A persistent, account-wide limit also works across Vercel serverless instances.
CREATE TABLE IF NOT EXISTS admin_login_limits (
  bucket text PRIMARY KEY,
  attempts integer NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now()
);
