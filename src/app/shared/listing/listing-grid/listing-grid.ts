import { NgOptimizedImage } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { CardComponent } from '@underlayerdev/ui';
import { ListingPricePipe } from '../listing-price/listing-price.pipe';
import { createListingSlug } from '../../utils/slugify';
import type { Listing } from '../../../domain/listing/listing.model';

const SKELETON_ROWS = 8;
// First N images get fetchpriority="high" (NgOptimizedImage's [priority]) —
// they're the ones actually visible above the fold on first paint.
const PRIORITY_IMAGE_COUNT = 4;

// Extracted out of discover/search, which used to each inline this exact
// ul-row/ul-card grid — kept them from drifting further apart (they'd
// already started to: search.html has a mobile header discover.html
// doesn't). Owns its own loading skeleton (originally only home.html had
// one) so every page that lists listings gets the same in-flight UI for
// free just by passing isLoading — no page needs its own skeleton markup.
@Component({
  selector: 'um-listing-grid',
  imports: [RouterLink, CardComponent, ListingPricePipe, TranslocoDirective, NgOptimizedImage],
  templateUrl: './listing-grid.html',
  styleUrl: './listing-grid.scss',
})
export class ListingGridComponent {
  readonly listings = input<Listing[]>([]);
  readonly isLoading = input(false);
  readonly emptyStateText = input('');

  readonly skeletonRows = computed(() => Array.from({ length: SKELETON_ROWS }));

  readonly createListingSlug = createListingSlug;
  protected readonly priorityImageCount = PRIORITY_IMAGE_COUNT;
}
