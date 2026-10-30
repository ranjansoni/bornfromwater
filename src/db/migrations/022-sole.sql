-- Add Solé without overwriting a catalogue row the owner may have edited.
BEGIN;
INSERT INTO catalog_products (slug, sku, name, collection, stone, price_cents, blurb, description, meaning, story, images, active, placeholder, sort_order) VALUES
(
  'sole',
  'BFW-SOLE',
  'Solé Bracelet',
  'signature',
  '14K Gold-Filled',
  4200,
  'One golden bead. A reminder that you are enough, just as you are.',
  'Solé is a 14K gold-filled bracelet with a single polished gold bead on a delicate chain. Inspired by the warmth of the sun, it is made for everyday wear, alone or layered.',
  $meaning$One golden bead. One beautiful reminder.
In a world of endless comparisons, there is only one you.
Unique. Radiant. Enough, just as you are.$meaning$,
  $story${"title":"Solé — One & Only ✨","paragraphs":["One golden bead. A reminder that you are enough, just as you are.","Inspired by the warmth of the sun, Solé celebrates the beauty of simplicity. A single radiant gold bead rests on a delicate chain — a quiet symbol of individuality, inner strength, and the light we carry within.","Effortlessly elegant, made to be worn every day, alone or layered."]}$story$::jsonb,
  $images$[{"src":"/products/sole/img-9638-new.jpeg","kind":"photo"},{"src":"/products/sole/img-9480.jpeg","kind":"photo"},{"src":"/products/sole/img-9637.jpeg","kind":"photo"},{"src":"/products/sole/img-9485.jpeg","kind":"photo"},{"src":"/products/sole/img-9634.jpeg","kind":"photo"},{"src":"/products/sole/img-9632.jpeg","kind":"photo"}]$images$::jsonb,
  true,
  false,
  11
)
ON CONFLICT (slug) DO NOTHING;
COMMIT;
