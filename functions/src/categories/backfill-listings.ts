import { firestore } from '../admin';

// The 7 values of the old flat `Category` enum (now retired — see
// docs/categories-plan.md phase 7), each mapped once to the single leaf
// categoryId in the tree that best represents it. Only needed here: this
// one-time migration is the last reader of a listing's old flat `category`
// string, for docs that predate the category tree and were never backfilled.
// Intentionally lossy — collapsing a flat bucket into a specific leaf loses
// nuance (e.g. a "Vehicles" listing could've been a car, a boat, or a
// motorcycle); sellers can move their own listings to a more specific leaf
// via the picker UI.
const LEGACY_CATEGORY_TO_LEAF: Record<string, string> = {
  Electronics: 'electronics-audio-video-other',
  Clothing: 'fashion-clothing-accessories-other',
  Furniture: 'home-furniture-furniture',
  Vehicles: 'vehicles-cars-motorcycles-other-vehicles',
  Books: 'books-media-other',
  Sports: 'sports-fitness-other',
  Other: 'other-miscellaneous',
};

interface CategoryLookupEntry {
  path: string[];
  isLeaf: boolean;
}

/**
 * One-time backfill (docs/categories-plan.md phase 4): sets `categoryId`/`categoryPath`
 * on every `listings` doc that doesn't have them yet, derived from its legacy `category`
 * string via LEGACY_CATEGORY_TO_LEAF. Never touches `updatedAt` — this is a silent schema
 * migration, not a listing edit, so it shouldn't bump anything sort/recency-related.
 * Idempotent: already-migrated docs (categoryId already set) are skipped, so re-running
 * only picks up listings created since the last run.
 */
export async function backfillListingCategories(): Promise<void> {
  const categoryLookup = await loadCategoryLookup();
  validateMappingTargets(categoryLookup);

  const listingsSnapshot = await firestore.collection('listings').get();
  const writer = firestore.bulkWriter();
  let migrated = 0;
  let skippedAlreadyMigrated = 0;
  let skippedUnknownCategory = 0;

  for (const doc of listingsSnapshot.docs) {
    const data = doc.data();
    if (data['categoryId']) {
      skippedAlreadyMigrated++;
      continue;
    }

    const legacyCategory = data['category'] as string | undefined;
    const leafId = legacyCategory ? LEGACY_CATEGORY_TO_LEAF[legacyCategory] : undefined;
    const leaf = leafId ? categoryLookup.get(leafId) : undefined;
    if (!leaf) {
      console.warn(`Skipping listing ${doc.id}: unmapped category "${String(legacyCategory)}"`);
      skippedUnknownCategory++;
      continue;
    }

    writer.set(doc.ref, { categoryId: leafId, categoryPath: leaf.path }, { merge: true });
    migrated++;
  }

  await writer.close();
  console.log(
    `Backfill done: ${migrated} migrated, ${skippedAlreadyMigrated} already migrated, ${skippedUnknownCategory} unmapped.`,
  );
}

async function loadCategoryLookup(): Promise<Map<string, CategoryLookupEntry>> {
  const snapshot = await firestore.collection('categories').get();
  return new Map(
    snapshot.docs.map((doc) => [
      doc.id,
      { path: doc.data()['path'] as string[], isLeaf: doc.data()['isLeaf'] as boolean },
    ]),
  );
}

function validateMappingTargets(categoryLookup: Map<string, CategoryLookupEntry>): void {
  for (const [legacyCategory, leafId] of Object.entries(LEGACY_CATEGORY_TO_LEAF)) {
    const leaf = categoryLookup.get(leafId);
    if (!leaf) {
      throw new Error(
        `LEGACY_CATEGORY_TO_LEAF["${legacyCategory}"] targets missing node "${leafId}".`,
      );
    }
    if (!leaf.isLeaf) {
      throw new Error(
        `LEGACY_CATEGORY_TO_LEAF["${legacyCategory}"] targets non-leaf node "${leafId}".`,
      );
    }
  }
}

if (require.main === module) {
  void backfillListingCategories().then(
    () => process.exit(0),
    (err: unknown) => {
      console.error(err);
      process.exit(1);
    },
  );
}
