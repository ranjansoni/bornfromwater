import type { Collection, Story } from './products';

export class CatalogInputError extends Error {}
export type CatalogUpdate = {
  name: string; collection: Collection; stone: string; priceCents: number;
  blurb: string; description: string; meaning: string; story: Story | null;
  active: boolean; placeholder: boolean; sortOrder: number; version: number;
};
export function validateCatalogUpdate(value: unknown): CatalogUpdate {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new CatalogInputError('Invalid product update.');
  const v = value as Record<string, unknown>;
  function text(key: string, max: number, required = true) {
    const input = v[key];
    if (typeof input !== 'string' || input.length > max || (required && !input.trim())) {
      throw new CatalogInputError(`Please check ${key}. Maximum ${max} characters.`);
    }
    return input.trim();
  }
  if (typeof v.price !== 'string' || !/^\d{1,6}(\.\d{1,2})?$/.test(v.price)) {
    throw new CatalogInputError('Enter a CAD price with up to two decimal places.');
  }
  const [dollars, fraction = ''] = v.price.split('.');
  const priceCents = Number(dollars) * 100 + Number(fraction.padEnd(2, '0'));
  if (priceCents < 100 || priceCents > 10000000) throw new CatalogInputError('Price must be between CA$1 and CA$100,000.');
  if (!['signature', 'tide'].includes(String(v.collection)) ||
    !['active', 'disabled', 'coming-soon'].includes(String(v.availability)) ||
    !Number.isInteger(v.sortOrder) || Number(v.sortOrder) < 0 || Number(v.sortOrder) > 9999 ||
    !Number.isInteger(v.version) || Number(v.version) < 1 || Number(v.version) >= 2147483647) {
    throw new CatalogInputError('Please check the collection, availability and display order.');
  }
  const title = text('storyTitle', 160, false);
  const paragraphs = text('storyText', 12000, false).split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  if (Boolean(title) !== Boolean(paragraphs.length)) throw new CatalogInputError('Add both a story title and paragraphs, or leave both blank.');
  return { name: text('name', 160), collection: v.collection as Collection, stone: text('stone', 160), priceCents,
    blurb: text('blurb', 500), description: text('description', 4000), meaning: text('meaning', 4000, false),
    story: title ? { title, paragraphs } : null, active: v.availability !== 'disabled',
    placeholder: v.availability === 'coming-soon', sortOrder: Number(v.sortOrder), version: Number(v.version) };
}
