import { beforeEach, describe, expect, it, vi } from 'vitest';
import { backfillListingCategories } from './backfill-listings';

const { collectionMock, bulkWriterMock } = vi.hoisted(() => {
  const collectionMock = vi.fn();
  const bulkWriterMock = vi.fn();
  return { collectionMock, bulkWriterMock };
});

vi.mock('../admin', () => ({
  firestore: { collection: collectionMock, bulkWriter: bulkWriterMock },
}));

const VALID_CATEGORY_NODES = [
  {
    id: 'electronics-audio-video-other',
    path: ['electronics', 'electronics-audio-video', 'electronics-audio-video-other'],
    isLeaf: true,
  },
  {
    id: 'fashion-clothing-accessories-other',
    path: ['fashion', 'fashion-clothing-accessories', 'fashion-clothing-accessories-other'],
    isLeaf: true,
  },
  {
    id: 'home-furniture-furniture',
    path: ['home-furniture', 'home-furniture-furniture'],
    isLeaf: true,
  },
  {
    id: 'vehicles-cars-motorcycles-other-vehicles',
    path: ['vehicles', 'vehicles-cars-motorcycles', 'vehicles-cars-motorcycles-other-vehicles'],
    isLeaf: true,
  },
  { id: 'books-media-other', path: ['books-media', 'books-media-other'], isLeaf: true },
  { id: 'sports-fitness-other', path: ['sports-fitness', 'sports-fitness-other'], isLeaf: true },
  { id: 'other-miscellaneous', path: ['other', 'other-miscellaneous'], isLeaf: true },
];

function categoryDocs(nodes = VALID_CATEGORY_NODES) {
  return nodes.map((n) => ({ id: n.id, data: () => ({ path: n.path, isLeaf: n.isLeaf }) }));
}

function listingDoc(id: string, data: Record<string, unknown>) {
  return { id, ref: { id }, data: () => data };
}

describe('backfillListingCategories', () => {
  let setSpy: ReturnType<typeof vi.fn>;
  let closeSpy: ReturnType<typeof vi.fn>;
  let listingsGetMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    setSpy = vi.fn();
    closeSpy = vi.fn().mockResolvedValue(undefined);
    bulkWriterMock.mockReturnValue({ set: setSpy, close: closeSpy });
    listingsGetMock = vi.fn();
    collectionMock.mockImplementation((name: string) => {
      if (name === 'categories')
        return { get: vi.fn().mockResolvedValue({ docs: categoryDocs() }) };
      if (name === 'listings') return { get: listingsGetMock };
      throw new Error(`unexpected collection: ${name}`);
    });
  });

  it('migrates a listing with a mapped legacy category', async () => {
    listingsGetMock.mockResolvedValue({
      docs: [listingDoc('l1', { category: 'Electronics' })],
    });

    await backfillListingCategories();

    expect(setSpy).toHaveBeenCalledWith(
      { id: 'l1' },
      {
        categoryId: 'electronics-audio-video-other',
        categoryPath: ['electronics', 'electronics-audio-video', 'electronics-audio-video-other'],
      },
      { merge: true },
    );
    expect(closeSpy).toHaveBeenCalled();
  });

  it('skips a listing that already has categoryId', async () => {
    listingsGetMock.mockResolvedValue({
      docs: [
        listingDoc('l1', { category: 'Electronics', categoryId: 'electronics-audio-video-other' }),
      ],
    });

    await backfillListingCategories();

    expect(setSpy).not.toHaveBeenCalled();
  });

  it('skips a listing with an unmapped category and does not throw', async () => {
    listingsGetMock.mockResolvedValue({
      docs: [listingDoc('l1', { category: 'NotARealCategory' })],
    });

    await expect(backfillListingCategories()).resolves.toBeUndefined();
    expect(setSpy).not.toHaveBeenCalled();
  });

  it('throws if a mapping target is missing from the seeded tree', async () => {
    collectionMock.mockImplementation((name: string) => {
      if (name === 'categories') {
        return {
          get: vi.fn().mockResolvedValue({ docs: categoryDocs(VALID_CATEGORY_NODES.slice(1)) }),
        };
      }
      if (name === 'listings') return { get: listingsGetMock };
      throw new Error(`unexpected collection: ${name}`);
    });
    listingsGetMock.mockResolvedValue({ docs: [] });

    await expect(backfillListingCategories()).rejects.toThrow(/targets missing node/);
  });

  it('throws if a mapping target is not a leaf', async () => {
    const nodes = VALID_CATEGORY_NODES.map((n) =>
      n.id === 'other-miscellaneous' ? { ...n, isLeaf: false } : n,
    );
    collectionMock.mockImplementation((name: string) => {
      if (name === 'categories')
        return { get: vi.fn().mockResolvedValue({ docs: categoryDocs(nodes) }) };
      if (name === 'listings') return { get: listingsGetMock };
      throw new Error(`unexpected collection: ${name}`);
    });
    listingsGetMock.mockResolvedValue({ docs: [] });

    await expect(backfillListingCategories()).rejects.toThrow(/targets non-leaf node/);
  });
});
