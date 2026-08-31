import type { CallableRequest } from 'firebase-functions/v2/https';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { firestore } from '../admin';
import { fetchCategoryName, fetchItemDescription, fetchItems, fetchUserItemIds } from './api';
import type { MercadoLibreItem } from './api';
import { mapCategoryName } from './category-map';
import { uploadRemoteImage } from './cloudinary';
import { CONNECTIONS_COLLECTION } from './constants';
import { getValidAccessToken } from './refresh-token';
import {
  cloudinaryApiKey,
  cloudinaryApiSecret,
  mercadoLibreClientId,
  mercadoLibreClientSecret,
} from './secrets';

const LISTINGS_COLLECTION = 'listings';

// Keep in sync with src/app/domain/currency/currency.model.ts.
const MAX_PRICE: Record<string, number> = { ARS: 1_000_000_000, USD: 1_000_000 };
// Keep in sync with src/app/domain/listing/listing-constraints.ts.
const TITLE_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 2000;
const MAX_IMAGES = 8;

export interface ImportResult {
  importedCount: number;
  skippedCount: number;
}

// Imports a single MercadoLibre item as a draft Listing. Returns false
// (skipped, not thrown) for anything this app's domain model can't
// represent — unsupported currency, out-of-range price, or a blank title —
// so one bad item never aborts the whole batch.
export async function importOne(
  item: MercadoLibreItem,
  uid: string,
  accessToken: string,
): Promise<boolean> {
  const maxPrice = MAX_PRICE[item.currency_id];
  if (maxPrice === undefined) return false;
  if (!Number.isFinite(item.price) || item.price < 0 || item.price > maxPrice) return false;

  const title = item.title?.trim();
  if (!title) return false;

  const categoryName = await fetchCategoryName(item.category_id);
  const category = mapCategoryName(categoryName);

  const fetchedDescription = await fetchItemDescription(accessToken, item.id);
  const description = fetchedDescription || `Imported from MercadoLibre: ${title}`;

  const sourceUrls = (item.pictures ?? [])
    .map((picture) => picture.secure_url || picture.url)
    .filter((url): url is string => !!url)
    .slice(0, MAX_IMAGES);
  const imageUrls = await Promise.all(sourceUrls.map((url) => uploadRemoteImage(url)));

  const now = new Date();
  await firestore.collection(LISTINGS_COLLECTION).add({
    ownerId: uid,
    title: title.slice(0, TITLE_MAX_LENGTH),
    description: description.slice(0, DESCRIPTION_MAX_LENGTH),
    price: item.price,
    currency: item.currency_id,
    category,
    imageUrls,
    status: 'draft',
    sourceProvider: 'mercadolibre',
    sourceId: item.id,
    createdAt: now,
    updatedAt: now,
  });

  return true;
}

export async function handleImportMercadoLibreListings(
  request: CallableRequest,
): Promise<ImportResult> {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in.');
  }
  const uid = request.auth.uid;

  const auth = await getValidAccessToken(uid);
  if (!auth) {
    throw new HttpsError('failed-precondition', 'Connect your MercadoLibre account first.');
  }

  const [itemIds, existingImportsSnapshot] = await Promise.all([
    fetchUserItemIds(auth.accessToken, auth.mlUserId),
    firestore
      .collection(LISTINGS_COLLECTION)
      .where('ownerId', '==', uid)
      .where('sourceProvider', '==', 'mercadolibre')
      .get(),
  ]);

  const alreadyImportedIds = new Set(
    existingImportsSnapshot.docs.map((doc) => doc.data()['sourceId'] as string),
  );
  const newItemIds = itemIds.filter((id) => !alreadyImportedIds.has(id));
  const items = await fetchItems(auth.accessToken, newItemIds);

  let importedCount = 0;
  let skippedCount = 0;

  for (const item of items) {
    try {
      if (await importOne(item, uid, auth.accessToken)) {
        importedCount++;
      } else {
        skippedCount++;
      }
    } catch {
      skippedCount++;
    }
  }

  await firestore
    .collection(CONNECTIONS_COLLECTION)
    .doc(uid)
    .update({ lastImportAt: new Date(), importedCount: alreadyImportedIds.size + importedCount });

  return { importedCount, skippedCount };
}

export const importMercadoLibreListings = onCall(
  {
    secrets: [
      mercadoLibreClientId,
      mercadoLibreClientSecret,
      cloudinaryApiKey,
      cloudinaryApiSecret,
    ],
    timeoutSeconds: 300,
    memory: '512MiB',
  },
  handleImportMercadoLibreListings,
);
