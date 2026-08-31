import type { CallableRequest } from 'firebase-functions/v2/https';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MercadoLibreItem } from './api';

const { whereMock, getMock, addMock, docMock, updateMock, collectionMock } = vi.hoisted(() => {
  const getMock = vi.fn();
  const addMock = vi.fn().mockResolvedValue({ id: 'new-doc' });
  const updateMock = vi.fn().mockResolvedValue(undefined);
  const docMock = vi.fn(() => ({ update: updateMock }));
  const whereMock = vi.fn();
  const collectionRef: {
    where: typeof whereMock;
    get: typeof getMock;
    add: typeof addMock;
    doc: typeof docMock;
  } = { where: whereMock, get: getMock, add: addMock, doc: docMock };
  whereMock.mockReturnValue(collectionRef);
  const collectionMock = vi.fn(() => collectionRef);
  return { whereMock, getMock, addMock, docMock, updateMock, collectionMock };
});

const { fetchUserItemIdsMock, fetchItemsMock, fetchItemDescriptionMock, fetchCategoryNameMock } =
  vi.hoisted(() => ({
    fetchUserItemIdsMock: vi.fn(),
    fetchItemsMock: vi.fn(),
    fetchItemDescriptionMock: vi.fn(),
    fetchCategoryNameMock: vi.fn(),
  }));

const { getValidAccessTokenMock } = vi.hoisted(() => ({ getValidAccessTokenMock: vi.fn() }));
const { uploadRemoteImageMock } = vi.hoisted(() => ({ uploadRemoteImageMock: vi.fn() }));

vi.mock('../admin', () => ({ firestore: { collection: collectionMock } }));
vi.mock('./api', () => ({
  fetchUserItemIds: fetchUserItemIdsMock,
  fetchItems: fetchItemsMock,
  fetchItemDescription: fetchItemDescriptionMock,
  fetchCategoryName: fetchCategoryNameMock,
}));
vi.mock('./refresh-token', () => ({ getValidAccessToken: getValidAccessTokenMock }));
vi.mock('./cloudinary', () => ({ uploadRemoteImage: uploadRemoteImageMock }));

import { handleImportMercadoLibreListings, importOne } from './import-listings';

function item(overrides: Partial<MercadoLibreItem> = {}): MercadoLibreItem {
  return {
    id: 'ML1',
    title: 'A nice chair',
    price: 1000,
    currency_id: 'ARS',
    category_id: 'CAT1',
    pictures: [{ url: 'https://ml-cdn.com/a.jpg', secure_url: 'https://ml-cdn.com/a-secure.jpg' }],
    ...overrides,
  };
}

describe('importOne', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchCategoryNameMock.mockResolvedValue('Muebles');
    fetchItemDescriptionMock.mockResolvedValue('A detailed description.');
    uploadRemoteImageMock.mockResolvedValue('https://res.cloudinary.com/rehosted.jpg');
  });

  it('should skip an item with an unsupported currency', async () => {
    const result = await importOne(item({ currency_id: 'BRL' }), 'uid-1', 'token');

    expect(result).toBe(false);
    expect(addMock).not.toHaveBeenCalled();
  });

  it('should skip an item priced above the currency cap', async () => {
    const result = await importOne(
      item({ currency_id: 'USD', price: 2_000_000 }),
      'uid-1',
      'token',
    );

    expect(result).toBe(false);
    expect(addMock).not.toHaveBeenCalled();
  });

  it('should skip an item with a negative price', async () => {
    const result = await importOne(item({ price: -1 }), 'uid-1', 'token');

    expect(result).toBe(false);
    expect(addMock).not.toHaveBeenCalled();
  });

  it('should skip an item with a blank title', async () => {
    const result = await importOne(item({ title: '   ' }), 'uid-1', 'token');

    expect(result).toBe(false);
    expect(addMock).not.toHaveBeenCalled();
  });

  it('should re-host pictures, map the category, and write a draft listing', async () => {
    const result = await importOne(item(), 'uid-1', 'token');

    expect(result).toBe(true);
    expect(uploadRemoteImageMock).toHaveBeenCalledWith('https://ml-cdn.com/a-secure.jpg');
    expect(addMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: 'uid-1',
        title: 'A nice chair',
        description: 'A detailed description.',
        price: 1000,
        currency: 'ARS',
        category: 'Furniture',
        imageUrls: ['https://res.cloudinary.com/rehosted.jpg'],
        status: 'draft',
        sourceProvider: 'mercadolibre',
        sourceId: 'ML1',
      }),
    );
  });

  it('should fall back to a title-derived description when none is available', async () => {
    fetchItemDescriptionMock.mockResolvedValue('');

    await importOne(item(), 'uid-1', 'token');

    expect(addMock).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Imported from MercadoLibre: A nice chair' }),
    );
  });
});

describe('handleImportMercadoLibreListings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMock.mockResolvedValue({ docs: [] });
    fetchCategoryNameMock.mockResolvedValue('');
    fetchItemDescriptionMock.mockResolvedValue('A description.');
    uploadRemoteImageMock.mockResolvedValue('https://res.cloudinary.com/rehosted.jpg');
  });

  function request(auth: { uid: string } | undefined): CallableRequest {
    return { auth } as unknown as CallableRequest;
  }

  it('should reject unauthenticated requests', async () => {
    await expect(handleImportMercadoLibreListings(request(undefined))).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });

  it('should reject when there is no MercadoLibre connection', async () => {
    getValidAccessTokenMock.mockResolvedValue(null);

    await expect(handleImportMercadoLibreListings(request({ uid: 'uid-1' }))).rejects.toMatchObject(
      { code: 'failed-precondition' },
    );
  });

  it('should skip items already imported and only fetch the remaining ones', async () => {
    getValidAccessTokenMock.mockResolvedValue({ accessToken: 'token', mlUserId: 42 });
    getMock.mockResolvedValue({ docs: [{ data: () => ({ sourceId: 'ML1' }) }] });
    fetchUserItemIdsMock.mockResolvedValue(['ML1', 'ML2']);
    fetchItemsMock.mockResolvedValue([item({ id: 'ML2' })]);

    const result = await handleImportMercadoLibreListings(request({ uid: 'uid-1' }));

    expect(fetchItemsMock).toHaveBeenCalledWith('token', ['ML2']);
    expect(result).toEqual({ importedCount: 1, skippedCount: 0 });
  });

  it('should count skipped items without aborting the batch and update the connection doc', async () => {
    getValidAccessTokenMock.mockResolvedValue({ accessToken: 'token', mlUserId: 42 });
    getMock.mockResolvedValue({ docs: [{ data: () => ({ sourceId: 'ML0' }) }] });
    fetchUserItemIdsMock.mockResolvedValue(['ML1', 'ML2']);
    fetchItemsMock.mockResolvedValue([
      item({ id: 'ML1' }),
      item({ id: 'ML2', currency_id: 'BRL' }),
    ]);

    const result = await handleImportMercadoLibreListings(request({ uid: 'uid-1' }));

    expect(result).toEqual({ importedCount: 1, skippedCount: 1 });
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ importedCount: 2 }));
  });

  it('should count an item as skipped when writing it throws', async () => {
    getValidAccessTokenMock.mockResolvedValue({ accessToken: 'token', mlUserId: 42 });
    fetchUserItemIdsMock.mockResolvedValue(['ML1']);
    fetchItemsMock.mockResolvedValue([item()]);
    addMock.mockRejectedValueOnce(new Error('Firestore write failed'));

    const result = await handleImportMercadoLibreListings(request({ uid: 'uid-1' }));

    expect(result).toEqual({ importedCount: 0, skippedCount: 1 });
  });
});
