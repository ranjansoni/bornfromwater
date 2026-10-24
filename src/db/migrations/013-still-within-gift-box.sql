-- Append the Still Within gift-box photograph once, preserving owner edits.
BEGIN;
WITH changed AS (
  UPDATE catalog_products
  SET images = images || '[{"src":"/products/still-within/gift-box.png","kind":"photo"}]'::jsonb,
    version = version + 1,
    updated_at = now()
  WHERE slug = 'still-within'
    AND version = 2
    AND jsonb_array_length(images) = 8
    AND images->7->>'src' = '/products/still-within/ceramic-hand-02.png'
  RETURNING *
)
INSERT INTO catalog_product_events (slug, version, snapshot)
SELECT slug, version, to_jsonb(changed) FROM changed;
COMMIT;
