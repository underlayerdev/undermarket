import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { firestore } from '../admin';

const CATEGORIES_COLLECTION = 'categories';
const CLASSIFICATIONS_COLLECTION = 'categoryClassifications';
const FALLBACK_LEAF_ID = 'other-miscellaneous';
// "-latest" alias, not a dated snapshot — Google repoints it at their current
// cheapest/fastest Gemini tier, which is all a single-field classification needs.
const MODEL = 'gemini-flash-lite-latest';
// Same region every other function in this project runs in (see callback.ts) —
// co-locating avoids a cross-region hop on every classification call.
const VERTEX_LOCATION = 'us-central1';
// __dirname at runtime is the compiled lib/categories/ dir — reach back into
// the repo root to read the Angular app's Spanish category names, since
// display names live in i18n (docs/categories-plan.md), not on the doc.
const ES_TRANSLATIONS_FILE = resolve(__dirname, '../../../public/assets/i18n/es.json');

interface LeafCategory {
  categoryId: string;
  path: string[];
  nameEs: string;
}

export interface ClassificationResult {
  categoryId: string;
  categoryPath: string[];
}

let cachedLeaves: LeafCategory[] | undefined;

/**
 * Classifies an external listing's provider category into one of our own
 * leaf categories, via Vertex AI (Gemini) — authenticated through the Cloud
 * Function's own runtime service account (Application Default Credentials),
 * no API key/secret to manage. Cached per (provider, externalCategoryId) —
 * not per listing — so the model is called once per distinct external
 * category ever seen, not once per imported item (docs/categories-plan.md
 * phase 5). Never throws: any failure (API error, malformed response) falls
 * back to `other-miscellaneous` without writing the cache, so a transient
 * failure gets retried on the next listing in that category instead of
 * sticking.
 */
export async function classifyCategory(
  provider: 'mercadolibre',
  externalCategoryId: string,
  externalCategoryName: string,
  listingTitle: string,
): Promise<ClassificationResult> {
  const leaves = await loadActiveLeaves();
  const fallback = leaves.find((leaf) => leaf.categoryId === FALLBACK_LEAF_ID);
  if (!fallback) {
    throw new Error(`Fallback leaf "${FALLBACK_LEAF_ID}" is missing from the seeded tree.`);
  }

  const cacheKey = `${provider}:${externalCategoryId}`;
  const cacheRef = firestore.collection(CLASSIFICATIONS_COLLECTION).doc(cacheKey);
  const cached = await cacheRef.get();
  const cachedCategoryId = cached.data()?.['categoryId'] as string | undefined;
  const cachedLeaf =
    cachedCategoryId && leaves.find((leaf) => leaf.categoryId === cachedCategoryId);
  if (cachedLeaf) return toResult(cachedLeaf);

  try {
    const categoryId = await callClassifier(leaves, externalCategoryName, listingTitle);
    const leaf = leaves.find((candidate) => candidate.categoryId === categoryId) ?? fallback;
    await cacheRef.set({ categoryId: leaf.categoryId, updatedAt: new Date() });
    return toResult(leaf);
  } catch (err) {
    console.warn(
      `Category classification failed for "${cacheKey}", falling back to "${FALLBACK_LEAF_ID}":`,
      err,
    );
    return toResult(fallback);
  }
}

function toResult(leaf: LeafCategory): ClassificationResult {
  return { categoryId: leaf.categoryId, categoryPath: leaf.path };
}

async function loadActiveLeaves(): Promise<LeafCategory[]> {
  if (cachedLeaves) return cachedLeaves;

  const [snapshot, names] = await Promise.all([
    firestore
      .collection(CATEGORIES_COLLECTION)
      .where('isActive', '==', true)
      .where('isLeaf', '==', true)
      .get(),
    Promise.resolve(loadSpanishNames()),
  ]);

  cachedLeaves = snapshot.docs.map((doc) => ({
    categoryId: doc.id,
    path: doc.data()['path'] as string[],
    nameEs: names.get(doc.id) ?? doc.id,
  }));
  return cachedLeaves;
}

function loadSpanishNames(): Map<string, string> {
  const translations = JSON.parse(readFileSync(ES_TRANSLATIONS_FILE, 'utf-8')) as Record<
    string,
    string
  >;
  const names = new Map<string, string>();
  for (const [key, value] of Object.entries(translations)) {
    if (key.startsWith('category.')) names.set(key.slice('category.'.length), value);
  }
  return names;
}

async function callClassifier(
  leaves: LeafCategory[],
  externalCategoryName: string,
  listingTitle: string,
): Promise<string> {
  // @google/genai ships ESM-only; this project compiles to CommonJS, so a
  // dynamic import is required here rather than a static one (TS1479).
  const { GoogleGenAI, Type } = await import('@google/genai');
  const client = new GoogleGenAI({
    vertexai: true,
    project: process.env['GCLOUD_PROJECT'],
    location: VERTEX_LOCATION,
  });
  const leafIds = leaves.map((leaf) => leaf.categoryId);
  const candidateList = leaves.map((leaf) => `${leaf.categoryId}: ${leaf.nameEs}`).join('\n');

  const response = await client.models.generateContent({
    model: MODEL,
    contents: `MercadoLibre category: "${externalCategoryName}"\nListing title: "${listingTitle}"`,
    config: {
      systemInstruction:
        'You classify marketplace listings imported from MercadoLibre Argentina into ' +
        "one specific leaf category of a fixed taxonomy. You're given the listing's " +
        'MercadoLibre category name and title (both Spanish). Pick the single best-fit ' +
        `categoryId from this list:\n\n${candidateList}\n\n` +
        `If nothing fits well, use "${FALLBACK_LEAF_ID}".`,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: { categoryId: { type: Type.STRING, format: 'enum', enum: leafIds } },
        required: ['categoryId'],
      },
    },
  });

  if (!response.text) throw new Error('Empty classifier response.');
  const parsed = JSON.parse(response.text) as { categoryId?: unknown };
  if (typeof parsed.categoryId !== 'string')
    throw new Error('Classifier response missing categoryId.');
  return parsed.categoryId;
}
