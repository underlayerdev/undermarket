import { describe, expect, it } from 'vitest';
import { mapCategoryName } from './category-map';

describe('mapCategoryName', () => {
  it.each([
    ['Ropa y Accesorios', 'Clothing'],
    ['Hogar, Muebles y Jardín', 'Furniture'],
    ['Autos, Motos y Otros', 'Vehicles'],
    ['Libros, Revistas y Comics', 'Books'],
    ['Deportes y Fitness', 'Sports'],
    ['Celulares y Teléfonos', 'Electronics'],
    ['Electrónica, Audio y Video', 'Electronics'],
  ] as const)('should map "%s" to %s', (name, expected) => {
    expect(mapCategoryName(name)).toBe(expected);
  });

  it('should default to Other for an unrecognized category name', () => {
    expect(mapCategoryName('Antigüedades y Colecciones')).toBe('Other');
  });

  it('should be case-insensitive', () => {
    expect(mapCategoryName('ROPA Y ACCESORIOS')).toBe('Clothing');
  });
});
