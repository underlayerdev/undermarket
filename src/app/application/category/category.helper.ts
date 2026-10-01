import { CategoryNode } from '../../domain/category-node/category-node.model';

// Root categoryIds with no physical "condition" — extend as more come up.
const CATEGORY_ROOTS_WITHOUT_CONDITION = new Set<string>(['services']);

// Featured nodes sort first (by featuredOrder), then everything else by the
// regular order — harmless for non-root nodes, since featured is always
// false there, so this behaves exactly like a plain order-sort for them.
function byDisplayOrder(a: CategoryNode, b: CategoryNode): number {
  if (a.featured && b.featured) return a.featuredOrder - b.featuredOrder;
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  return a.order - b.order;
}

export const rootCategories = (categories: CategoryNode[] = []) =>
  categories.filter((category) => category.depth === 0).sort(byDisplayOrder);

export const childrenOf = (categories: CategoryNode[] = [], parentId: string | null) =>
  categories.filter((category) => category.parentId === parentId).sort(byDisplayOrder);

/** The whole tree, sorted so a caller can map it straight into a flat picker/chip list without losing display order. */
export const sortedByDisplayOrder = (categories: CategoryNode[] = []): CategoryNode[] =>
  [...categories].sort(byDisplayOrder);

export const getById = (
  categories: CategoryNode[] = [],
  categoryId: string,
): CategoryNode | undefined => {
  return categories.find((category) => category.categoryId === categoryId);
};
/**
 * Whether a listing filed under categoryId should ask for a physical
 * condition (New/Used) at all — false for roots like `services`, where
 * "condition" doesn't mean anything. Keyed off the root (path[0]), so every
 * node under an excluded root inherits the same answer. Defaults to true
 * for an unknown/not-yet-loaded categoryId — condition is the safer
 * default until a category actually says otherwise.
 */
export const requiresCondition = (categories: CategoryNode[] = [], categoryId: string): boolean => {
  const category = getById(categories, categoryId);
  const rootId = category?.path[0] ?? categoryId;
  return !CATEGORY_ROOTS_WITHOUT_CONDITION.has(rootId);
};
