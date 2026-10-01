import { beforeEach, describe, expect, it, vi } from 'vitest';

const LEAVES = [
  { id: 'home-furniture-furniture', path: ['home-furniture', 'home-furniture-furniture'] },
  { id: 'other-miscellaneous', path: ['other', 'other-miscellaneous'] },
];

const ES_TRANSLATIONS = {
  'category.home-furniture-furniture': 'Muebles para el Hogar',
  'category.other-miscellaneous': 'Varios',
  'unrelated.key': 'not a category',
};

const { categoriesGetMock, cacheGetMock, cacheSetMock, cacheDocMock, collectionMock } = vi.hoisted(
  () => {
    const categoriesGetMock = vi.fn();
    const cacheGetMock = vi.fn();
    const cacheSetMock = vi.fn().mockResolvedValue(undefined);
    const cacheDocMock = vi.fn(() => ({ get: cacheGetMock, set: cacheSetMock }));
    const collectionMock = vi.fn((name: string) => {
      if (name === 'categories') return { where: vi.fn().mockReturnThis(), get: categoriesGetMock };
      if (name === 'categoryClassifications') return { doc: cacheDocMock };
      throw new Error(`unexpected collection: ${name}`);
    });
    return { categoriesGetMock, cacheGetMock, cacheSetMock, cacheDocMock, collectionMock };
  },
);

const { generateContentMock, googleGenAICtorMock } = vi.hoisted(() => {
  const generateContentMock = vi.fn();
  const googleGenAICtorMock = vi.fn(function GoogleGenAIMock() {
    return { models: { generateContent: generateContentMock } };
  });
  return { generateContentMock, googleGenAICtorMock };
});

vi.mock('../admin', () => ({ firestore: { collection: collectionMock } }));
vi.mock('@google/genai', () => ({
  GoogleGenAI: googleGenAICtorMock,
  Type: { OBJECT: 'OBJECT', STRING: 'STRING' },
}));
vi.mock('node:fs', () => ({ readFileSync: vi.fn(() => JSON.stringify(ES_TRANSLATIONS)) }));

function categoryDocs() {
  return LEAVES.map((leaf) => ({ id: leaf.id, data: () => ({ path: leaf.path }) }));
}

function jsonResponse(categoryId: string) {
  return { text: JSON.stringify({ categoryId }) };
}

describe('classifyCategory', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    categoriesGetMock.mockResolvedValue({ docs: categoryDocs() });
    cacheGetMock.mockResolvedValue({ data: () => undefined });
  });

  it('returns a cached classification without calling the model', async () => {
    cacheGetMock.mockResolvedValue({ data: () => ({ categoryId: 'home-furniture-furniture' }) });
    const { classifyCategory } = await import('./category-map');

    const result = await classifyCategory('mercadolibre', 'MLA1', 'Muebles', 'Silla de madera');

    expect(result).toEqual({
      categoryId: 'home-furniture-furniture',
      categoryPath: ['home-furniture', 'home-furniture-furniture'],
    });
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it('classifies via the model on a cache miss and writes the cache', async () => {
    generateContentMock.mockResolvedValue(jsonResponse('home-furniture-furniture'));
    const { classifyCategory } = await import('./category-map');

    const result = await classifyCategory('mercadolibre', 'MLA1', 'Muebles', 'Silla de madera');

    expect(result).toEqual({
      categoryId: 'home-furniture-furniture',
      categoryPath: ['home-furniture', 'home-furniture-furniture'],
    });
    expect(cacheDocMock).toHaveBeenCalledWith('mercadolibre:MLA1');
    expect(cacheSetMock).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: 'home-furniture-furniture' }),
    );
  });

  it('falls back to other-miscellaneous without caching when the API call fails', async () => {
    generateContentMock.mockRejectedValue(new Error('rate limited'));
    const { classifyCategory } = await import('./category-map');

    const result = await classifyCategory('mercadolibre', 'MLA1', 'Muebles', 'Silla de madera');

    expect(result).toEqual({
      categoryId: 'other-miscellaneous',
      categoryPath: ['other', 'other-miscellaneous'],
    });
    expect(cacheSetMock).not.toHaveBeenCalled();
  });

  it('falls back to other-miscellaneous when the response has no text', async () => {
    generateContentMock.mockResolvedValue({ text: undefined });
    const { classifyCategory } = await import('./category-map');

    const result = await classifyCategory('mercadolibre', 'MLA1', 'Muebles', 'Silla de madera');

    expect(result).toEqual({
      categoryId: 'other-miscellaneous',
      categoryPath: ['other', 'other-miscellaneous'],
    });
    expect(cacheSetMock).not.toHaveBeenCalled();
  });

  it('throws if the fallback leaf is missing from the seeded tree', async () => {
    categoriesGetMock.mockResolvedValue({
      docs: categoryDocs().filter((doc) => doc.id !== 'other-miscellaneous'),
    });
    const { classifyCategory } = await import('./category-map');

    await expect(classifyCategory('mercadolibre', 'MLA1', 'Muebles', 'Silla')).rejects.toThrow(
      /Fallback leaf/,
    );
  });
});
