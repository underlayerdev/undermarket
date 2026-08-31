import { ML_API_HOST } from './constants';

// Response shapes below are based on MercadoLibre's documented API as of
// training knowledge, not live-verified (this sandbox's network is blocked
// from reaching mercadolibre.com/api.mercadolibre.com entirely — every
// request returns a 403 from their WAF). Worth a quick sanity check against
// real responses on the first manual import test.
export interface MercadoLibreItem {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  category_id: string;
  pictures?: { url: string; secure_url?: string }[];
}

const ITEMS_PAGE_SIZE = 50;
const ITEMS_MULTIGET_BATCH_SIZE = 20; // ML caps /items?ids= at 20 per call.

async function mlFetch(url: string, accessToken: string): Promise<Response> {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) {
    throw new Error(`MercadoLibre API request failed (${response.status}): ${url}`);
  }
  return response;
}

export async function fetchUserItemIds(accessToken: string, mlUserId: number): Promise<string[]> {
  const ids: string[] = [];
  let offset = 0;

  for (;;) {
    const url = new URL(`${ML_API_HOST}/users/${mlUserId}/items/search`);
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('limit', String(ITEMS_PAGE_SIZE));

    const response = await mlFetch(url.toString(), accessToken);
    const data = (await response.json()) as { results: string[]; paging: { total: number } };
    ids.push(...data.results);

    offset += ITEMS_PAGE_SIZE;
    if (data.results.length === 0 || offset >= data.paging.total) break;
  }

  return ids;
}

export async function fetchItems(accessToken: string, ids: string[]): Promise<MercadoLibreItem[]> {
  const items: MercadoLibreItem[] = [];

  for (let i = 0; i < ids.length; i += ITEMS_MULTIGET_BATCH_SIZE) {
    const batch = ids.slice(i, i + ITEMS_MULTIGET_BATCH_SIZE);
    const url = new URL(`${ML_API_HOST}/items`);
    url.searchParams.set('ids', batch.join(','));

    const response = await mlFetch(url.toString(), accessToken);
    const entries = (await response.json()) as { code: number; body: MercadoLibreItem }[];
    for (const entry of entries) {
      if (entry.code === 200) items.push(entry.body);
    }
  }

  return items;
}

export async function fetchItemDescription(accessToken: string, itemId: string): Promise<string> {
  try {
    const response = await mlFetch(`${ML_API_HOST}/items/${itemId}/description`, accessToken);
    const data = (await response.json()) as { plain_text?: string; text?: string };
    return (data.plain_text || data.text || '').trim();
  } catch {
    // Description is a nice-to-have; a failed fetch shouldn't skip the item.
    return '';
  }
}

const categoryNameCache = new Map<string, string>();

export async function fetchCategoryName(categoryId: string): Promise<string> {
  const cached = categoryNameCache.get(categoryId);
  if (cached !== undefined) return cached;

  try {
    const response = await fetch(`${ML_API_HOST}/categories/${categoryId}`);
    if (!response.ok) return '';
    const data = (await response.json()) as { name?: string };
    const name = data.name ?? '';
    categoryNameCache.set(categoryId, name);
    return name;
  } catch {
    return '';
  }
}
