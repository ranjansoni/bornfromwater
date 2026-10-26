export const BRACELET_SIZES = [
  { value: 'small', label: '6.5″' },
  { value: 'medium', label: '7″' },
  { value: 'large', label: '7.5″' },
] as const;
export type BraceletSize = typeof BRACELET_SIZES[number]['value'];
export const DEFAULT_SIZE: BraceletSize = 'medium';
export function isBraceletSize(value: unknown): value is BraceletSize {
  return BRACELET_SIZES.some(size => size.value === value);
}
export function sizeLabel(size: BraceletSize) {
  return BRACELET_SIZES.find(option => option.value === size)!.label;
}
export function cartLineKey(slug: string, size: BraceletSize = DEFAULT_SIZE) {
  return slug + ':' + size;
}
