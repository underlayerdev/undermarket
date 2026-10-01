// Keep this in sync with src/app/domain/category-node/category-node.model.ts
// (and firestore.rules' `categories/{categoryId}` match block) — a third,
// separate copy for the same reason category-map.ts's Category type is:
// functions/ is its own TypeScript project and can't import from the
// Angular app.
//
// Excludes createdAt/updatedAt: seed-categories.ts sets those itself
// (createdAt only on first write, updatedAt on every write) rather than
// trusting a seed file's author to get "set once" semantics right by hand.
export interface CategoryNodeInput {
  categoryId: string;
  parentId: string | null;
  path: string[];
  depth: number;
  order: number;
  // Only set on root nodes (depth 0) — every UI consumer already falls back
  // to the root's icon for deeper nodes, so descendants never carry one.
  icon?: string;
  isActive: boolean;
  isLeaf: boolean;
  // Curated "most important" roots shown first in chip rows/pickers —
  // decoupled from `order` on purpose. Only meaningful on root nodes.
  featured: boolean;
  featuredOrder: number;
  updatedBy: string;
}
