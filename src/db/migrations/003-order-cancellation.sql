-- Apply after 002. Only operational tables change; orders/payments are untouched.
BEGIN;
ALTER TABLE order_fulfillment DROP CONSTRAINT IF EXISTS order_fulfillment_status_check;
ALTER TABLE order_fulfillment ADD CONSTRAINT order_fulfillment_status_check
  CHECK (status IN ('unfulfilled', 'packed', 'shipped', 'delivered', 'cancelled'));
-- Keep a cancellation's explanation even if the owner later reopens the order.
ALTER TABLE order_fulfillment_events ADD COLUMN IF NOT EXISTS internal_note text NOT NULL DEFAULT '';
COMMIT;
