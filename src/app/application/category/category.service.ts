import { computed, inject, Injectable, signal } from '@angular/core';
import { CATEGORY_NODE_REPOSITORY } from '../../core/configuration/tokens';
import type { CategoryNode } from '../../domain/category-node/category-node.model';
import {
  childrenOf,
  getById,
  requiresCondition,
  rootCategories,
  sortedByDisplayOrder,
} from './category.helper';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly categoryRepository = inject(CATEGORY_NODE_REPOSITORY);
  private loadPromise: Promise<CategoryNode[]> | null = null;

  readonly tree = signal<CategoryNode[] | undefined>(undefined);

  readonly roots = computed(() => rootCategories(this.tree()));

  /** The whole tree, featured roots first — for mapping into a flat picker/chip list. */
  readonly orderedTree = computed(() => sortedByDisplayOrder(this.tree()));

  /**
   * The taxonomy changes rarely (docs/categories-plan.md §7), so this fetches
   * once per app session — every caller afterward shares the same cached
   * tree(). A second call while the first fetch is still in flight awaits
   * that same in-flight request rather than firing a duplicate one.
   */
  async ensureLoaded(): Promise<CategoryNode[]> {
    const cached = this.tree();
    if (cached) return cached;
    if (!this.loadPromise) {
      this.loadPromise = this.categoryRepository.getAll().then((categories) => {
        this.tree.set(categories);
        return categories;
      });
    }
    return this.loadPromise;
  }

  /** Root→leaf nodes for categoryId — e.g. a listing-detail breadcrumb. */
  breadcrumbFor(categoryId: string): CategoryNode[] {
    const category = getById(this.tree(), categoryId);
    if (!category) return [];
    return category.path
      .map((ancestorId) => getById(this.tree(), ancestorId))
      .filter((node): node is CategoryNode => !!node);
  }

  getById(categoryId: string) {
    return getById(this.tree(), categoryId);
  }

  childrenOf(parentId: string | null) {
    return childrenOf(this.tree(), parentId);
  }

  requiresCondition(categoryId: string) {
    return requiresCondition(this.tree(), categoryId);
  }
}
