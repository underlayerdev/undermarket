import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FieldValue } from 'firebase-admin/firestore';
import { firestore } from '../admin';
import type { CategoryNodeInput } from './category-node';

const CATEGORIES_COLLECTION = 'categories';
// __dirname at runtime is the compiled lib/categories/ dir (tsc doesn't copy
// non-.ts files into outDir), so this reaches back into src/ rather than
// expecting a copy of the fixture to exist alongside the compiled JS. Only
// matters for the default — an explicit path via argv works from anywhere.
const DEFAULT_SEED_FILE = resolve(__dirname, '../../src/categories/seed/categories.example.json');

/**
 * Upserts a seed JSON file into `categories/{categoryId}`, then soft-
 * deactivates any currently-active doc whose id isn't in the file — never
 * deletes, since listings may reference a category forever (see
 * docs/categories-plan.md, phase 5). Idempotent: running it twice with the
 * same file only changes `updatedAt` on the second run.
 *
 * A plain script, not a callable Cloud Function — curation of what's in a
 * seed file is a human sign-off step (per the plan doc), not something a
 * client should ever be able to trigger. Run via `npm run seed:categories`
 * (functions/package.json), which requires the runner to already have
 * Admin SDK credentials configured locally.
 */
export async function seedCategories(filePath: string): Promise<void> {
  const nodes = JSON.parse(readFileSync(filePath, 'utf-8')) as CategoryNodeInput[];
  const now = new Date();

  for (const node of nodes) {
    await upsertNode(node, now);
  }

  await deactivateMissing(new Set(nodes.map((node) => node.categoryId)), now);
}

async function upsertNode(node: CategoryNodeInput, now: Date): Promise<void> {
  const ref = firestore.collection(CATEGORIES_COLLECTION).doc(node.categoryId);
  const existing = await ref.get();
  await ref.set(
    {
      ...node,
      // node.icon is absent for every non-root node on purpose (see
      // category-node.ts) — merge:true otherwise leaves a stale icon on a
      // doc that already had one from before this field became root-only.
      ...(node.icon === undefined ? { icon: FieldValue.delete() } : {}),
      updatedAt: now,
      // Set once, on first seed, then left alone on every re-seed after —
      // spreading `now` here unconditionally would make createdAt drift to
      // whenever the script last ran instead of when the category first
      // appeared.
      ...(existing.exists ? {} : { createdAt: now }),
    },
    { merge: true },
  );
}

async function deactivateMissing(seededIds: Set<string>, now: Date): Promise<void> {
  const snapshot = await firestore
    .collection(CATEGORIES_COLLECTION)
    .where('isActive', '==', true)
    .get();
  const stale = snapshot.docs.filter((doc) => !seededIds.has(doc.id));
  await Promise.all(
    stale.map((doc) => doc.ref.set({ isActive: false, updatedAt: now }, { merge: true })),
  );
}

if (require.main === module) {
  const filePath = process.argv[2] ? resolve(process.argv[2]) : DEFAULT_SEED_FILE;
  void seedCategories(filePath).then(
    () => process.exit(0),
    (err: unknown) => {
      console.error(err);
      process.exit(1);
    },
  );
}
