import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCategoryName, fetchItemDescription, fetchItems, fetchUserItemIds } from './api';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

describe('mercado-libre api', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('fetchUserItemIds', () => {
    it('should paginate until all results are collected', async () => {
      // A real server returns a full page (matching the requested limit)
      // until the last one — total=52 over a 50-per-page limit means the
      // first call returns 50 results, the second returns the remaining 2.
      const firstPage = Array.from({ length: 50 }, (_, i) => `item-${i}`);
      vi.mocked(fetch)
        .mockResolvedValueOnce(jsonResponse({ results: firstPage, paging: { total: 52 } }))
        .mockResolvedValueOnce(jsonResponse({ results: ['item-50', 'item-51'], paging: { total: 52 } }));

      const ids = await fetchUserItemIds('token', 123);

      expect(ids).toEqual([...firstPage, 'item-50', 'item-51']);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw when MercadoLibre returns a non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, false, 401));

      await expect(fetchUserItemIds('token', 123)).rejects.toThrow('401');
    });
  });

  describe('fetchItems', () => {
    it('should batch ids and only keep successful entries', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        jsonResponse([
          { code: 200, body: { id: 'A', title: 'Item A' } },
          { code: 404, body: {} },
        ]),
      );

      const items = await fetchItems('token', ['A', 'B']);

      expect(items).toEqual([{ id: 'A', title: 'Item A' }]);
    });
  });

  describe('fetchItemDescription', () => {
    it('should return plain_text when present', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ plain_text: 'Great item' }));

      expect(await fetchItemDescription('token', 'A')).toBe('Great item');
    });

    it('should return an empty string instead of throwing on failure', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('network down'));

      expect(await fetchItemDescription('token', 'A')).toBe('');
    });
  });

  describe('fetchCategoryName', () => {
    it('should fetch and cache the category name', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ name: 'Ropa y Accesorios' }));

      expect(await fetchCategoryName('MLA1430')).toBe('Ropa y Accesorios');
      expect(await fetchCategoryName('MLA1430')).toBe('Ropa y Accesorios');
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });
});
