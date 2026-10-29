-- Replace Pure Heart's first and fifth photos with the approved wrist image as lead.
BEGIN;
WITH changed AS (
  UPDATE catalog_products
  SET images = '[{"src":"/products/pure-heart/wrist-lotus.png","kind":"photo"}]'::jsonb
    || jsonb_build_array(
      images->1, images->2, images->3, images->5, images->6, images->7,
      images->8, images->9, images->10, images->11, images->12
    ),
    version = version + 1,
    updated_at = now()
  WHERE slug = 'pure-heart'
    AND jsonb_array_length(images) = 13
    AND ARRAY(
      SELECT image.value->>'src'
      FROM jsonb_array_elements(images) WITH ORDINALITY AS image(value, position)
      ORDER BY image.position
    ) = ARRAY[
      '/products/pure-heart/01.jpg',
      '/products/pure-heart/02.jpg',
      '/products/pure-heart/03.jpg',
      '/products/pure-heart/04.jpg',
      '/products/pure-heart/05.jpg',
      '/products/pure-heart/06.jpg',
      '/products/pure-heart/07.jpg',
      '/products/pure-heart/06-presentation.png',
      '/products/pure-heart/09.jpg',
      '/products/pure-heart/10.jpg',
      '/products/pure-heart/11.jpg',
      '/products/pure-heart/12.jpg',
      '/products/pure-heart/13.jpg'
    ]
  RETURNING *
)
INSERT INTO catalog_product_events (slug, version, snapshot)
SELECT slug, version, to_jsonb(changed) FROM changed;
COMMIT;
