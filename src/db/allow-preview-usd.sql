-- Run once in the Neon SQL Editor before enabling the Preview USD experiment.
-- Keeps existing orders and the CAD default; permits truthful USD test-order records.
BEGIN;
ALTER TABLE orders DROP CONSTRAINT orders_currency_check;
ALTER TABLE orders ADD CONSTRAINT orders_currency_check CHECK (currency IN ('CAD', 'USD'));
COMMIT;
