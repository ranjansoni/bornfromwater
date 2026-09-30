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
