-- Add the approved Pearl Drift story while preserving any owner-written story.
BEGIN;
WITH changed AS (
  UPDATE catalog_products
  SET story = $story${"title":"Pearl Drift","paragraphs":["Some things are meant to flow, not be forced.","Life, like the ocean, is constantly moving. Some days the tides are gentle; other days, they carry us in unexpected directions.","Yet through it all, we learn to trust the journey, let go of what we cannot control, and embrace where life takes us.","Inspired by pearls drifting with the rhythm of the sea, Pearl Drift is a gentle reminder that not everything beautiful needs a destination. Sometimes, the beauty lies in simply allowing yourself to flow.","Let go. Trust the tide. Find beauty in the journey."]}$story$::jsonb,
    version = version + 1,
    updated_at = now()
  WHERE slug = 'pearl-drift' AND story IS NULL
  RETURNING *
)
INSERT INTO catalog_product_events (slug, version, snapshot)
SELECT slug, version, to_jsonb(changed) FROM changed;
COMMIT;
