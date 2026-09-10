import { Component, computed, input, model } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { PillComponent, SelectableRowComponent } from '@underlayerdev/ui';
import { ListingListSkeletonComponent } from './listing-list-skeleton/listing-list-skeleton';
import type { Listing, ListingId } from '../../../domain/listing/listing.model';
import { ListingPricePipe } from '../listing-price/listing-price.pipe';
import { createListingSlug } from '../../utils/slugify';

@Component({
  selector: 'um-listings-list',
  templateUrl: 'listing-list.html',
  styleUrl: 'listing-list.scss',
  imports: [
    RouterLink,
    SelectableRowComponent,
    TranslocoDirective,
    ListingListSkeletonComponent,
    ListingPricePipe,
    PillComponent,
  ],
})
export class ListingListComponent {
  readonly listings = input<Listing[]>([]);

  readonly isLoading = input(true);

  // Each consumer supplies its own copy for what "selecting a row" means in
  // its context (e.g. profile's bulk-delete flow) — this component has no
  // opinion on it.
  readonly ariaLabel = input('');

  // Two-way: parent binds `[(selection)]` to read selected ids (e.g. for a
  // bulk-delete bar) and to clear/preset them without duplicating this state.
  readonly selection = model<ReadonlySet<ListingId>>(new Set());

  readonly hasSelection = computed(() => this.selection().size > 0);

  // "All"/"some" are relative to `listings()` — the parent decides what's
  // visible (search/sort applied upstream) before it ever reaches this input.
  readonly allSelected = computed(() => {
    const visible = this.listings();
    return visible.length > 0 && visible.every((listing) => this.selection().has(listing.id));
  });

  readonly someSelected = computed(
    () =>
      !this.allSelected() && this.listings().some((listing) => this.selection().has(listing.id)),
  );

  readonly createListingSlug = createListingSlug;

  isSelected(id: ListingId): boolean {
    return this.selection().has(id);
  }

  toggleSelect(id: ListingId, checked: boolean): void {
    this.selection.update((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  toggleSelectAll(checked: boolean): void {
    const visibleIds = this.listings().map((listing) => listing.id);
    this.selection.update((current) => {
      const next = new Set(current);
      for (const id of visibleIds) {
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      return next;
    });
  }
}
