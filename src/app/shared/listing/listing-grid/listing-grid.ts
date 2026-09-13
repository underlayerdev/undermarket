import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardComponent } from '@underlayerdev/ui';
import { ListingPricePipe } from '../listing-price/listing-price.pipe';
import { createListingSlug } from '../../utils/slugify';
import type { Listing } from '../../../domain/listing/listing.model';

// Extracted out of discover/search, which used to each inline this exact
// ul-row/ul-card grid — kept them from drifting further apart (they'd
// already started to: search.html has a mobile header discover.html
// doesn't).
@Component({
  selector: 'um-listing-grid',
  imports: [RouterLink, CardComponent, ListingPricePipe],
  templateUrl: './listing-grid.html',
})
export class ListingGridComponent {
  readonly listings = input<Listing[]>([]);
  readonly emptyStateText = input('');

  readonly createListingSlug = createListingSlug;
}
