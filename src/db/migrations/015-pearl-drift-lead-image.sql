-- Move Pearl Drift's existing eighth image to the front, retaining all images and owner edits.
BEGIN;
WITH changed AS (
  UPDATE catalog_products
  SET images = jsonb_build_array(jsonb_set(images->7, '{kind}', '"photo"'::jsonb)) || (images - 7),
    version = version + 1,
    updated_at = now()
  WHERE slug = 'pearl-drift'
    AND jsonb_array_length(images) = 10
    AND images->0->>'src' = '/products/pearl-drift/01.jpg'
    AND images->7->>'src' = '/products/pearl-drift/06.png'
    AND images->7->>'kind' = 'graphic'
  RETURNING *
)
INSERT INTO catalog_product_events (slug, version, snapshot)
SELECT slug, version, to_jsonb(changed) FROM changed;
COMMIT;
