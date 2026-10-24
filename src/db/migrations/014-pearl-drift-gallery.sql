-- Replace Pearl Drift's fourth image with the three new product photos, preserving owner edits.
BEGIN;
WITH changed AS (
  UPDATE catalog_products
  SET images = jsonb_build_array(images->0, images->1, images->2)
    || '[{"src":"/products/pearl-drift/plaster-hand-01.png","kind":"photo"},{"src":"/products/pearl-drift/plaster-hand-02.png","kind":"photo"},{"src":"/products/pearl-drift/plaster-hand-03.png","kind":"photo"}]'::jsonb
    || jsonb_build_array(images->4, images->5, images->6, images->7),
    version = version + 1,
    updated_at = now()
  WHERE slug = 'pearl-drift'
    AND version = 2
    AND jsonb_array_length(images) = 8
    AND images->3->>'src' = '/products/pearl-drift/04.jpg'
    AND images->7->>'src' = '/products/pearl-drift/08.png'
  RETURNING *
)
INSERT INTO catalog_product_events (slug, version, snapshot)
SELECT slug, version, to_jsonb(changed) FROM changed;
COMMIT;
