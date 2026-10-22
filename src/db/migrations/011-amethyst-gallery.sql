-- Remove the owner's selected Amethyst Tide gallery image without changing orders or other product fields.
BEGIN;
WITH changed AS (
  UPDATE catalog_products
  SET images = (
      SELECT jsonb_agg(image.value ORDER BY image.position)
      FROM jsonb_array_elements(catalog_products.images) WITH ORDINALITY AS image(value, position)
      WHERE image.position <> 11
    ),
    version = version + 1,
    updated_at = now()
  WHERE slug = 'amethyst-tide'
    AND version = 1
    AND jsonb_array_length(images) = 16
    AND images->10->>'src' = '/products/amethyst-tide/11.jpg'
  RETURNING *
)
INSERT INTO catalog_product_events (slug, version, snapshot)
SELECT slug, version, to_jsonb(changed) FROM changed;
COMMIT;
