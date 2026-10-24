-- Append the two new Still Within photos without changing existing images or other product details.
BEGIN;
WITH changed AS (
  UPDATE catalog_products
  SET images = images || '[{"src":"/products/still-within/ceramic-hand-01.png","kind":"photo"},{"src":"/products/still-within/ceramic-hand-02.png","kind":"photo"}]'::jsonb,
    version = version + 1,
    updated_at = now()
  WHERE slug = 'still-within'
    AND version = 1
    AND jsonb_array_length(images) = 6
    AND images->5->>'src' = '/products/still-within/closeup-02.jpeg'
  RETURNING *
)
INSERT INTO catalog_product_events (slug, version, snapshot)
SELECT slug, version, to_jsonb(changed) FROM changed;
COMMIT;
