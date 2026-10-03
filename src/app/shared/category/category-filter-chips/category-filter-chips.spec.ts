import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CategoryFilterChipsComponent } from './category-filter-chips';
import { CategoryService } from '../../../application/category/category.service';
import {
  LISTING_QUERY_FN,
  ListingResultsStore,
} from '../../../application/listing/listing-results.store';
import { SearchLocationService } from '../../../application/services/search-location.service';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';
import type { CategoryNode } from '../../../domain/category-node/category-node.model';

function node(overrides: Partial<CategoryNode> = {}): CategoryNode {
  return {
    categoryId: 'electronics',
    parentId: null,
    path: ['electronics'],
    depth: 0,
    order: 0,
    icon: 'computer',
    isActive: true,
    isLeaf: false,
    featured: false,
    featuredOrder: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    updatedBy: 'seed-script',
    ...overrides,
  };
}

// Real categoryIds (seed/categories.v1.json) with their real en.json labels
// below — the component translates `category.${id}` itself now, so the
// test fixture must use ids that actually resolve to something, rather than
// arbitrary labels passed straight through an input.
const DEFAULT_NODES: CategoryNode[] = [
  node({ categoryId: 'electronics', path: ['electronics'] }), // "Electronics"
  node({
    categoryId: 'electronics-computing', // "Computers"
    parentId: 'electronics',
    depth: 1,
    isLeaf: true,
    path: ['electronics', 'electronics-computing'],
  }),
  node({
    categoryId: 'electronics-phones', // "Cell Phones & Telephones"
    parentId: 'electronics',
    depth: 1,
    order: 1,
    isLeaf: true,
    path: ['electronics', 'electronics-phones'],
  }),
  node({ categoryId: 'other', order: 1, isLeaf: true, path: ['other'] }), // "Other"
];

function fakeCategoryService(nodes: CategoryNode[]) {
  return { orderedTree: () => nodes };
}

@Component({
  imports: [CategoryFilterChipsComponent],
  template: `
    <um-category-filter-chips
      allLabel="All categories"
      showMoreLabel="Show more"
      [visibleCount]="visibleCount"
    />
  `,
})
class HostComponent {
  visibleCount = 5;
}

function setup(options: { visibleCount?: number; nodes?: CategoryNode[] } = {}) {
  TestBed.configureTestingModule({
    imports: [HostComponent, getTranslocoTestingModule()],
    providers: [
      { provide: CategoryService, useValue: fakeCategoryService(options.nodes ?? DEFAULT_NODES) },
      { provide: LISTING_QUERY_FN, useValue: vi.fn().mockResolvedValue([]) },
      { provide: SearchLocationService, useValue: { searchLocation: () => null } },
      ListingResultsStore,
    ],
  });
  const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
  fixture.componentInstance.visibleCount = options.visibleCount ?? 5;
  fixture.detectChanges();
  return fixture;
}

function categoryId(): string | null {
  return TestBed.inject(ListingResultsStore).categoryId();
}

function pillByText(fixture: ComponentFixture<HostComponent>, text: string): HTMLElement {
  const pills: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('ul-pill'));
  const pill = pills.find((el) => el.textContent?.trim() === text);
  if (!pill) throw new Error(`No pill found for "${text}"`);
  return pill;
}

// "Show more" appears in both rows at once when both are truncated — this
// scopes to one specific row (0 = roots, 1 = children) instead of relying on
// pillByText's first-match.
function showMoreInRow(fixture: ComponentFixture<HostComponent>, rowIndex: number): HTMLElement {
  const row = fixture.nativeElement.querySelectorAll('.um-category-filter-chips__row')[rowIndex];
  const pill = Array.from(row.querySelectorAll('ul-pill') as NodeListOf<HTMLElement>).find(
    (el) => el.textContent?.trim() === 'Show more',
  );
  if (!pill) throw new Error(`No "Show more" pill found in row ${rowIndex}`);
  return pill;
}

describe('CategoryFilterChipsComponent', () => {
  it('shows only root-level chips plus "All" when nothing is selected', () => {
    const fixture = setup();

    expect(pillByText(fixture, 'All categories')).toBeTruthy();
    expect(pillByText(fixture, 'Electronics')).toBeTruthy();
    expect(pillByText(fixture, 'Other')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('ul-pill').length).toBe(3);
  });

  it('selects a root and reveals its children on click', () => {
    const fixture = setup();

    pillByText(fixture, 'Electronics').click();
    fixture.detectChanges();

    expect(categoryId()).toBe('electronics');
    expect(pillByText(fixture, 'Computers')).toBeTruthy();
    expect(pillByText(fixture, 'Cell Phones & Telephones')).toBeTruthy();
  });

  it('selects a child, narrowing the filter to that child id', () => {
    const fixture = setup();
    pillByText(fixture, 'Electronics').click();
    fixture.detectChanges();

    pillByText(fixture, 'Computers').click();
    fixture.detectChanges();

    expect(categoryId()).toBe('electronics-computing');
  });

  it('toggles a selected child back up to its root on a second click', () => {
    const fixture = setup();
    pillByText(fixture, 'Electronics').click();
    fixture.detectChanges();
    pillByText(fixture, 'Computers').click();
    fixture.detectChanges();

    pillByText(fixture, 'Computers').click();
    fixture.detectChanges();

    expect(categoryId()).toBe('electronics');
  });

  it('resets to no selection when "All categories" is clicked', () => {
    const fixture = setup();
    pillByText(fixture, 'Electronics').click();
    fixture.detectChanges();

    pillByText(fixture, 'All categories').click();
    fixture.detectChanges();

    expect(categoryId()).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('ul-pill').length).toBe(3);
  });

  it('switching directly to a root with no children hides the children row', () => {
    const fixture = setup();
    pillByText(fixture, 'Electronics').click();
    fixture.detectChanges();

    pillByText(fixture, 'Other').click();
    fixture.detectChanges();

    expect(categoryId()).toBe('other');
    expect(fixture.nativeElement.querySelectorAll('ul-pill').length).toBe(3);
  });

  describe('show more', () => {
    it('truncates the roots row to visibleCount, with a trailing "show more" chip', () => {
      const fixture = setup({ visibleCount: 1 });

      expect(pillByText(fixture, 'Electronics')).toBeTruthy();
      expect(() => pillByText(fixture, 'Other')).toThrow();
      expect(pillByText(fixture, 'Show more')).toBeTruthy();
    });

    it('reveals every root once "show more" is clicked, and removes itself', () => {
      const fixture = setup({ visibleCount: 1 });

      pillByText(fixture, 'Show more').click();
      fixture.detectChanges();

      expect(pillByText(fixture, 'Electronics')).toBeTruthy();
      expect(pillByText(fixture, 'Other')).toBeTruthy();
      expect(() => pillByText(fixture, 'Show more')).toThrow();
    });

    it('truncates the children row independently, with its own "show more" chip', () => {
      const fixture = setup({ visibleCount: 1 });
      pillByText(fixture, 'Electronics').click();
      fixture.detectChanges();

      expect(pillByText(fixture, 'Computers')).toBeTruthy();
      expect(() => pillByText(fixture, 'Cell Phones & Telephones')).toThrow();
      // Two rows truncated independently: root row (Electronics + its own
      // show-more, "All" always shown) and children row (Computers + its
      // own show-more) — 5 pills total.
      expect(fixture.nativeElement.querySelectorAll('ul-pill').length).toBe(5);
    });

    it('resets a previously-expanded children row back to collapsed on a new root', () => {
      const richNodes: CategoryNode[] = [
        ...DEFAULT_NODES,
        node({ categoryId: 'fashion', order: 2, path: ['fashion'] }), // "Fashion"
        node({
          categoryId: 'fashion-clothing-accessories', // "Clothing & Accessories"
          parentId: 'fashion',
          depth: 1,
          isLeaf: true,
          path: ['fashion', 'fashion-clothing-accessories'],
        }),
      ];
      const fixture = setup({ visibleCount: 1, nodes: richNodes });
      pillByText(fixture, 'Electronics').click();
      fixture.detectChanges();
      showMoreInRow(fixture, 1).click(); // expands the children row
      fixture.detectChanges();
      expect(pillByText(fixture, 'Cell Phones & Telephones')).toBeTruthy();

      showMoreInRow(fixture, 0).click(); // expands the roots row
      fixture.detectChanges();
      pillByText(fixture, 'Fashion').click();
      fixture.detectChanges();

      // Fashion's own (single) child shows with no "show more" needed, and
      // switching back to Electronics proves its children row re-collapsed.
      expect(pillByText(fixture, 'Clothing & Accessories')).toBeTruthy();
      pillByText(fixture, 'Electronics').click();
      fixture.detectChanges();

      expect(pillByText(fixture, 'Computers')).toBeTruthy();
      expect(() => pillByText(fixture, 'Cell Phones & Telephones')).toThrow();
    });
  });
});
