import type { CategoryNode } from './category-node.model';

export interface CategoryNodeRepository {
  /** Every active node in the tree, root→leaf, in one shot — see CategoryService for caching. */
  getAll(): Promise<CategoryNode[]>;
}
