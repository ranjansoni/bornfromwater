-- Curate the approved Aquamarine Tide gallery, led by the wrist photograph.
BEGIN;
WITH changed AS (
  UPDATE catalog_products
  SET images = jsonb_build_array(
      images->9, images->8, images->3, images->11, images->2,
      images->5, images->12, images->7, images->0, images->4,
      images->1, images->10
    ),
    version = version + 1,
    updated_at = now()
  WHERE slug = 'aquamarine-tide'
    AND jsonb_array_length(images) = 13
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
      '/products/aquamarine-tide/11.jpg',
      '/products/aquamarine-tide/img-8637.jpeg',
      '/products/aquamarine-tide/img-8638.jpeg',
      '/products/aquamarine-tide/flatlay-03.png',
      '/products/aquamarine-tide/img-8991.jpeg',
      '/products/aquamarine-tide/img-8631.jpeg'
    ]
  RETURNING *
)
INSERT INTO catalog_product_events (slug, version, snapshot)
SELECT slug, version, to_jsonb(changed) FROM changed;
COMMIT;
