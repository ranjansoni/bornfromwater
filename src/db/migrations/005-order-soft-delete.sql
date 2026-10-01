-- Portal visibility only. Original orders, payments and fulfillment status remain intact.
BEGIN;
ALTER TABLE order_fulfillment ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE order_fulfillment_events ADD COLUMN IF NOT EXISTS action text NOT NULL DEFAULT 'updated'
  CHECK (action IN ('updated', 'deleted', 'restored'));
COMMIT;
