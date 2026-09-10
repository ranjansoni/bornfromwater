CREATE TABLE IF NOT EXISTS orders (
  order_id uuid PRIMARY KEY,
  validated_cart jsonb NOT NULL,
  total_cents integer NOT NULL CHECK (total_cents > 0),
  currency char(3) NOT NULL DEFAULT 'CAD' CHECK (currency IN ('CAD', 'USD')),
  payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'processing', 'approved', 'declined')),
  checkout_request_id uuid NOT NULL UNIQUE,
  godaddy_transaction_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
