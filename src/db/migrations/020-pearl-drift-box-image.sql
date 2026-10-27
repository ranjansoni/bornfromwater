-- Append the Pearl Drift gift-box photograph to the known gallery, preserving owner edits.
BEGIN;
WITH changed AS (
  UPDATE catalog_products
  SET images = images || '[{"src":"/products/pearl-drift/img-9251.jpeg","kind":"photo"}]'::jsonb,
    version = version + 1,
    updated_at = now()
  WHERE slug = 'pearl-drift'
    AND jsonb_array_length(images) = 10
    AND ARRAY(
      SELECT image.value->>'src'
      FROM jsonb_array_elements(images) WITH ORDINALITY AS image(value, position)
      ORDER BY image.position
    ) = ARRAY[
      '/products/pearl-drift/06.png',
      '/products/pearl-drift/01.jpg',
      '/products/pearl-drift/02.jpg',
      '/products/pearl-drift/03.jpg',
      '/products/pearl-drift/plaster-hand-01.png',
      '/products/pearl-drift/plaster-hand-02.png',
      '/products/pearl-drift/plaster-hand-03.png',
      '/products/pearl-drift/05.png',
      '/products/pearl-drift/07.png',
      '/products/pearl-drift/08.png'
    ]
  RETURNING *
)
INSERT INTO catalog_product_events (slug, version, snapshot)
SELECT slug, version, to_jsonb(changed) FROM changed;
COMMIT;
