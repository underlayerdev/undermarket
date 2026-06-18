export const CATEGORIES = [
  'Electronics',
  'Clothing',
  'Furniture',
  'Vehicles',
  'Books',
  'Sports',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];
