import { Component, inject, input, signal } from '@angular/core';
import { CardComponent, ImageNotFoundComponent, ImageNotFoundDirective } from '@underlayerdev/ui';
import { CarouselComponent, CarouselItemComponent } from '@underlayerdev/ui/carousel';
import { Listing } from '../../../../domain/listing/listing.model';
import { RouterLink } from '@angular/router';
import { Options } from '@splidejs/splide';
import { createListingSlug } from '../../../../shared/utils/slugify';
import { ListingPricePipe } from '../../../../shared/listing';
import { TranslocoDirective } from '@jsverse/transloco';
import { LISTING_REPOSITORY } from '../../../../core/configuration/tokens';
// How many similar items to keep. Enough to fill the carousel at the widest
// breakpoint with a few left to swipe to, without holding the whole feed.
const SIMILAR_LISTINGS_LIMIT = 12;

@Component({
  selector: 'um-listing-detail-similar-items',
  templateUrl: './listing-detail-similar-items.html',
  styleUrl: 'listing-detail-similar-items.scss',
  imports: [
    RouterLink,
    TranslocoDirective,
    CarouselComponent,
    CarouselItemComponent,
    CardComponent,
    ImageNotFoundComponent,
    ImageNotFoundDirective,
    ListingPricePipe,
  ],
})
export class ListingDetailSimilarItems {
  readonly listing = input.required<Listing>();
  readonly similarListings = signal<Listing[]>([]);

  readonly createListingSlug = createListingSlug;

  private readonly listingRepository = inject(LISTING_REPOSITORY);

  async ngOnInit(): Promise<void> {
    await this.loadSimilar(this.listing());
  }

  // Splide's `breakpoints` keys are max-widths, so these read as "at 1023px and
  // below, 2 per page" — one step below each of the design system's own
  // breakpoints (sm 768, md 1024, lg 1280).
  readonly similarCarouselOptions: Options = {
    perPage: 5,
    gap: '16px',
    arrows: true,
    pagination: false,
    autoplay: false,
    breakpoints: {
      1279: { perPage: 4 },
      1023: { perPage: 3 },
      // No cursor to hover an arrow with below this — pagination dots are the
      // better affordance on touch.
      767: { perPage: 2, arrows: false, pagination: true },
    },
  };

  // Stand-in for real relevance ranking: reuses the same latest-listings feed
  // the home page shows, with same-category items floated to the front so the
  // row is at least plausibly "similar". Swap the source for Algolia (or
  // whatever search backend lands) without touching the template. Like the
  // seller block, a failure here only drops the section.
  private async loadSimilar(listing: Listing): Promise<void> {
    try {
      const latest = await this.listingRepository.getLatest();
      const candidates = latest.filter((l) => l.id !== listing.id && l.status === 'active');
      this.similarListings.set(
        [
          ...candidates.filter((l) => l.category === listing.category),
          ...candidates.filter((l) => l.category !== listing.category),
        ].slice(0, SIMILAR_LISTINGS_LIMIT),
      );
    } catch {
      this.similarListings.set([]);
    }
  }
}
