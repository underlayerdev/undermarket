// Keep this closed set in sync with src/app/domain/category/category.model.ts
// (and firestore.rules' isValidCategory) — this is a third, separate copy
// because functions/ is its own TypeScript project and can't import from the
// Angular app. MercadoLibre's own category IDs aren't documented as stable
// across marketplaces/time, so this matches on the category's own display
// name (fetched via GET /categories/{id}) instead of hardcoding ML category
// IDs that would need independent verification against the live API.
export type Category =
  | 'Electronics'
  | 'Clothing'
  | 'Furniture'
  | 'Vehicles'
  | 'Books'
  | 'Sports'
  | 'Other';

const KEYWORD_MAP: { keywords: string[]; category: Category }[] = [
  { keywords: ['ropa', 'calzado', 'indumentaria', 'accesorios de moda'], category: 'Clothing' },
  {
    keywords: ['hogar', 'muebles', 'jardín', 'jardin', 'decoración', 'decoracion'],
    category: 'Furniture',
  },
  { keywords: ['auto', 'moto', 'vehículo', 'vehiculo'], category: 'Vehicles' },
  { keywords: ['libro', 'revista', 'comic'], category: 'Books' },
  { keywords: ['deporte', 'fitness'], category: 'Sports' },
  {
    keywords: [
      'electrónic',
      'electronic',
      'celular',
      'teléfono',
      'telefono',
      'cómputo',
      'computo',
      'audio',
      'video',
      'tecnología',
      'tecnologia',
    ],
    category: 'Electronics',
  },
];

export function mapCategoryName(name: string): Category {
  const lower = name.toLowerCase();
  for (const { keywords, category } of KEYWORD_MAP) {
    if (keywords.some((keyword) => lower.includes(keyword))) return category;
  }
  return 'Other';
}
