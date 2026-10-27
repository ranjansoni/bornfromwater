-- Append the three approved Aquamarine Tide photographs once, preserving existing gallery edits.
BEGIN;
WITH changed AS (
  UPDATE catalog_products
  SET images = images || '[
      {"src":"/products/aquamarine-tide/img-8637.jpeg","kind":"photo"},
      {"src":"/products/aquamarine-tide/img-8638.jpeg","kind":"photo"},
      {"src":"/products/aquamarine-tide/flatlay-03.png","kind":"photo"}
    ]'::jsonb,
    version = version + 1,
    updated_at = now()
  WHERE slug = 'aquamarine-tide'
    AND jsonb_array_length(images) = 8
    AND ARRAY(
      SELECT image.value->>'src'
      FROM jsonb_array_elements(images) WITH ORDINALITY AS image(value, position)
      ORDER BY image.position
    ) = ARRAY[
      '/products/aquamarine-tide/01.jpg',
      '/products/aquamarine-tide/03.jpg',
      '/products/aquamarine-tide/04.jpg',
      '/products/aquamarine-tide/06.jpg',
      '/products/aquamarine-tide/07.jpg',
      '/products/aquamarine-tide/08.jpg',
      '/products/aquamarine-tide/10.jpg',
      '/products/aquamarine-tide/11.jpg'
    ]
  RETURNING *
)
INSERT INTO catalog_product_events (slug, version, snapshot)
SELECT slug, version, to_jsonb(changed) FROM changed;
COMMIT;
