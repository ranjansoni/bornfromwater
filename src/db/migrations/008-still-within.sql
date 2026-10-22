-- Add Still Within without changing owner-edited catalogue rows or orders.
BEGIN;
INSERT INTO catalog_products (slug, sku, name, collection, stone, price_cents, blurb, description, meaning, story, images, active, placeholder, sort_order) VALUES
(
  'still-within',
  'BFW-STILL-WITHIN',
  'Still Within Bracelet',
  'tide',
  'Pearl',
  5200,
  'A quiet place within, held close in gold and pearl.',
  'Still Within is a delicate bracelet with a 14k gold-filled shell-inspired charm, one pearl, and a 14k gold-filled chain and clasp. A reminder that peace can be found within, even when the world feels chaotic.',
  $meaning$A gentle reminder that peace isn't always found around us. Sometimes, it's found within.$meaning$,
  $story${"title":"STILL WITHIN 🐚","paragraphs":["Even when the world turns upside down, there is a quiet place within you.","Like a shell cradling its precious pearl, we too can retreat into ourselves when life becomes overwhelming.","The waves may rise. The tides may turn. The world may feel chaotic.","But somewhere beneath it all, there is stillness.","A gentle reminder that peace isn't always found around us. Sometimes, it's found within.","Still Within — Born From Water","Wear your story. 🤍"]}$story$::jsonb,
  $images$[{"src":"/products/still-within/01.webp","kind":"photo"},{"src":"/products/still-within/02.webp","kind":"photo"},{"src":"/products/still-within/03.webp","kind":"photo"},{"src":"/products/still-within/04.webp","kind":"photo"},{"src":"/products/still-within/05.webp","kind":"photo"},{"src":"/products/still-within/06.webp","kind":"photo"}]$images$::jsonb,
  true,
  false,
  9
)
ON CONFLICT (slug) DO NOTHING;
COMMIT;
