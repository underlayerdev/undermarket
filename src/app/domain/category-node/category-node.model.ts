/**
 * A node in the hierarchical category tree stored in `categories/{categoryId}`
 * (see docs/categories-plan.md). Replaces the flat `Category` enum
 * (category.model.ts) — that type and the `Listing.category` field it backs
 * are untouched for now; this model exists alongside them until a later
 * migration phase switches listings over.
 *
 * The tree is entirely our own — not synced from or coupled to any external
 * provider's taxonomy. Mapping a provider's category (e.g. MercadoLibre) onto
 * one of these nodes is a best-effort, cached AI classification done at
 * import time, not a stored field on the node itself.
 */
export interface CategoryNode {
  categoryId: string;
  parentId: string | null;
  /** Ancestor ids root→leaf, including this node's own id. */
  path: string[];
  /** 0 = root. */
  depth: number;
  /** Sibling display order. */
  order: number;
  /**
   * ul-icon glyph name, for chip/tree UI. Only set on root nodes (depth 0) —
   * every UI consumer already falls back to the root's icon for deeper
   * nodes, so descendants never carry one.
   */
  icon?: string;
  /** Soft-deprecate instead of delete — listings reference these forever. */
  isActive: boolean;
  /** Whether a listing may be filed directly under this node. */
  isLeaf: boolean;
  /**
   * Curated "most important" roots, shown first (before the regular
   * order-sorted rest) in chip rows/pickers — decoupled from `order` on
   * purpose, since "where this sits once everything's expanded" and "is
   * this important enough to feature" aren't always the same decision.
   * Only meaningful on root nodes (depth 0) today; always false elsewhere.
   */
  featured: boolean;
  /** Sibling order among featured nodes only — meaningless when featured is false. */
  featuredOrder: number;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
}
