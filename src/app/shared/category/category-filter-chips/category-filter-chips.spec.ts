import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { CategoryPickerNode } from '@underlayerdev/ui';
import { CategoryFilterChipsComponent } from './category-filter-chips';

const nodes: CategoryPickerNode[] = [
  { id: 'electronics', parentId: null, label: 'Electronics', isLeaf: false },
  { id: 'electronics-computing', parentId: 'electronics', label: 'Computing', isLeaf: true },
  { id: 'electronics-phones', parentId: 'electronics', label: 'Phones', isLeaf: true },
  { id: 'other', parentId: null, label: 'Other', isLeaf: true },
];

@Component({
  imports: [CategoryFilterChipsComponent],
  template: `
    <um-category-filter-chips
      [nodes]="nodes"
      allLabel="All categories"
      showMoreLabel="Show more"
      [visibleCount]="visibleCount"
      [(selectedId)]="selectedId"
    />
  `,
})
class HostComponent {
  nodes = nodes;
  visibleCount = 5;
  selectedId: string | null = null;
}

function setup(options: { visibleCount?: number; nodes?: CategoryPickerNode[] } = {}) {
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
  fixture.componentInstance.visibleCount = options.visibleCount ?? 5;
  if (options.nodes) fixture.componentInstance.nodes = options.nodes;
  fixture.detectChanges();
  return fixture;
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

    expect(fixture.componentInstance.selectedId).toBe('electronics');
    expect(pillByText(fixture, 'Computing')).toBeTruthy();
    expect(pillByText(fixture, 'Phones')).toBeTruthy();
  });

  it('selects a child, narrowing the filter to that child id', () => {
    const fixture = setup();
    pillByText(fixture, 'Electronics').click();
    fixture.detectChanges();

    pillByText(fixture, 'Computing').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedId).toBe('electronics-computing');
  });

  it('toggles a selected child back up to its root on a second click', () => {
    const fixture = setup();
    pillByText(fixture, 'Electronics').click();
    fixture.detectChanges();
    pillByText(fixture, 'Computing').click();
    fixture.detectChanges();

    pillByText(fixture, 'Computing').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedId).toBe('electronics');
  });

  it('resets to no selection when "All categories" is clicked', () => {
    const fixture = setup();
    pillByText(fixture, 'Electronics').click();
    fixture.detectChanges();

    pillByText(fixture, 'All categories').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedId).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('ul-pill').length).toBe(3);
  });

  it('switching directly to a root with no children hides the children row', () => {
    const fixture = setup();
    pillByText(fixture, 'Electronics').click();
    fixture.detectChanges();

    pillByText(fixture, 'Other').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedId).toBe('other');
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

      expect(pillByText(fixture, 'Computing')).toBeTruthy();
      expect(() => pillByText(fixture, 'Phones')).toThrow();
      // Two rows truncated independently: root row (Electronics + its own
      // show-more, "All" always shown) and children row (Computing + its
      // own show-more) — 5 pills total.
      expect(fixture.nativeElement.querySelectorAll('ul-pill').length).toBe(5);
    });

    it('resets a previously-expanded children row back to collapsed on a new root', () => {
      const richNodes: CategoryPickerNode[] = [
        { id: 'electronics', parentId: null, label: 'Electronics', isLeaf: false },
        { id: 'electronics-computing', parentId: 'electronics', label: 'Computing', isLeaf: true },
        { id: 'electronics-phones', parentId: 'electronics', label: 'Phones', isLeaf: true },
        { id: 'fashion', parentId: null, label: 'Fashion', isLeaf: false },
        { id: 'fashion-shoes', parentId: 'fashion', label: 'Shoes', isLeaf: true },
      ];
      const fixture = setup({ visibleCount: 1, nodes: richNodes });
      pillByText(fixture, 'Electronics').click();
      fixture.detectChanges();
      showMoreInRow(fixture, 1).click(); // expands the children row
      fixture.detectChanges();
      expect(pillByText(fixture, 'Phones')).toBeTruthy();

      showMoreInRow(fixture, 0).click(); // expands the roots row
      fixture.detectChanges();
      pillByText(fixture, 'Fashion').click();
      fixture.detectChanges();

      // Fashion's own (single) child shows with no "show more" needed, and
      // switching back to Electronics proves its children row re-collapsed.
      expect(pillByText(fixture, 'Shoes')).toBeTruthy();
      pillByText(fixture, 'Electronics').click();
      fixture.detectChanges();

      expect(pillByText(fixture, 'Computing')).toBeTruthy();
      expect(() => pillByText(fixture, 'Phones')).toThrow();
    });
  });
});
