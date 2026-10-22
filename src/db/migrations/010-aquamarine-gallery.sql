-- Remove the owner's selected Aquamarine Tide gallery positions without changing orders or other product fields.
BEGIN;
WITH changed AS (
  UPDATE catalog_products
  SET images = (
      SELECT jsonb_agg(image.value ORDER BY image.position)
      FROM jsonb_array_elements(catalog_products.images) WITH ORDINALITY AS image(value, position)
      WHERE image.position NOT IN (2, 5, 9)
    ),
    version = version + 1,
    updated_at = now()
  WHERE slug = 'aquamarine-tide'
    AND version = 1
    AND jsonb_array_length(images) = 11
    AND images->1->>'src' = '/products/aquamarine-tide/02.jpg'
    AND images->4->>'src' = '/products/aquamarine-tide/05.jpg'
    AND images->8->>'src' = '/products/aquamarine-tide/09.jpg'
  RETURNING *
)
INSERT INTO catalog_product_events (slug, version, snapshot)
SELECT slug, version, to_jsonb(changed) FROM changed;
COMMIT;
