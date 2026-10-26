-- Move Still Within's existing fourth photo to the front, retaining all images and owner edits.
BEGIN;
WITH changed AS (
  UPDATE catalog_products
  SET images = jsonb_build_array(images->3) || (images - 3),
    version = version + 1,
    updated_at = now()
  WHERE slug = 'still-within'
    AND jsonb_array_length(images) = 9
    AND images->0->>'src' = '/products/still-within/01.webp'
    AND images->3->>'src' = '/products/still-within/05-updated.webp'
  RETURNING *
)
INSERT INTO catalog_product_events (slug, version, snapshot)
SELECT slug, version, to_jsonb(changed) FROM changed;
COMMIT;
