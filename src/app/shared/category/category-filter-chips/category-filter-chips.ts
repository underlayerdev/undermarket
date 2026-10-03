import { Component, computed, inject, input, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { PillComponent } from '@underlayerdev/ui';
import type { CategoryPickerNode } from '@underlayerdev/ui';
import { CategoryService } from '../../../application/category/category.service';
import { ListingResultsStore } from '../../../application/listing/listing-results.store';

const VISIBLE_CHIPS_AMOUNT = 5;

/**
 * Chip-based category filter: root-level chips plus, once a root is picked,
 * a second row of that root's direct children for narrowing — matches
 * docs/categories-plan.md §7's "top-level chips, drill into children".
 * Reads/writes `ListingResultsStore.categoryId` directly rather than a
 * `[(selectedId)]` the page has to wire — the page only needs to `provide`
 * the store, this component does the rest. Filters listings by
 * `categoryPath array-contains` that id (handled inside the store/
 * repository), which already matches the node itself and everything under
 * it, so this never needs to go deeper than one level of drill-down to be
 * useful as a broad-or-narrow filter — unlike ul-category-picker, picking a
 * leaf isn't required here.
 *
 * Each row is capped at visibleCount chips, with a trailing "show more" chip
 * (roots: 21 of them today, easily more later; children vary per root) —
 * expanding one row is independent of the other.
 */
@Component({
  selector: 'um-category-filter-chips',
  imports: [PillComponent],
  templateUrl: './category-filter-chips.html',
  styleUrl: './category-filter-chips.scss',
})
export class CategoryFilterChipsComponent {
  private readonly store = inject(ListingResultsStore);
  private readonly categoryService = inject(CategoryService);
  private readonly transloco = inject(TranslocoService);

  readonly allLabel = input.required<string>();
  readonly showMoreLabel = input.required<string>();
  readonly visibleCount = input<number>(VISIBLE_CHIPS_AMOUNT);

  protected readonly selectedId = this.store.categoryId;

  private readonly nodes = computed<CategoryPickerNode[]>(() => {
    this.transloco.activeLang();
    return this.categoryService.orderedTree().map((node) => ({
      id: node.categoryId,
      parentId: node.parentId,
      label: this.transloco.translate(`category.${node.categoryId}`),
      // Root-only — see new-listing.ts's categoryPickerNodes for why.
      icon: node.depth === 0 ? node.icon : undefined,
      isLeaf: node.isLeaf,
    }));
  });
  private readonly nodesById = computed(() => new Map(this.nodes().map((node) => [node.id, node])));
  private readonly rootsExpanded = signal(false);
  private readonly childrenExpanded = signal(false);

  protected readonly roots = computed(() => this.nodes().filter((node) => node.parentId === null));
  protected readonly visibleRoots = computed(() =>
    this.rootsExpanded() ? this.roots() : this.roots().slice(0, this.visibleCount()),
  );
  protected readonly hasMoreRoots = computed(
    () => !this.rootsExpanded() && this.roots().length > this.visibleCount(),
  );

  // Selection is always either a root or a direct child of one (enforced by
  // selectRoot()/selectChild() below), so the root is one hop away at most.
  protected readonly selectedRootId = computed(() => {
    const id = this.selectedId();
    if (!id) return null;
    const node = this.nodesById().get(id);
    if (!node) return null;
    return node.parentId ?? node.id;
  });

  protected readonly children = computed(() => {
    const rootId = this.selectedRootId();
    if (!rootId) return [];
    return this.nodes().filter((node) => node.parentId === rootId);
  });
  protected readonly visibleChildren = computed(() =>
    this.childrenExpanded() ? this.children() : this.children().slice(0, this.visibleCount()),
  );
  protected readonly hasMoreChildren = computed(
    () => !this.childrenExpanded() && this.children().length > this.visibleCount(),
  );

  selectRoot(id: string | null): void {
    this.store.setCategoryId(id);
    // A new root means a brand new children list — always start it collapsed.
    this.childrenExpanded.set(false);
  }

  selectChild(id: string): void {
    this.store.setCategoryId(this.selectedId() === id ? this.selectedRootId() : id);
  }

  showMoreRoots(): void {
    this.rootsExpanded.set(true);
  }

  showMoreChildren(): void {
    this.childrenExpanded.set(true);
  }
}
