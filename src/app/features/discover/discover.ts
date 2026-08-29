import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ListingService } from '../../application/services/listing.service';
import { SeoService } from '../../core/seo/seo.service';
import { CATEGORIES } from '../../domain/category/category.model';
import { ListingPricePipe } from '../../shared/pipes/listing-price/listing-price.pipe';
import { createListingSlug } from '../../shared/utils/slugify';
import { CardComponent, PillComponent } from '@underlayerdev/ui';

@Component({
  selector: 'um-discover',
  imports: [RouterLink, CardComponent, PillComponent, ListingPricePipe, TranslocoDirective],
  templateUrl: './discover.html',
})
export class DiscoverComponent implements OnInit {
  protected readonly listingService = inject(ListingService);
  private readonly seoService = inject(SeoService);
  private readonly transloco = inject(TranslocoService);

  readonly createListingSlug = createListingSlug;
  readonly categories = CATEGORIES;
  readonly selectedCategory = signal<string | null>(null);

  ngOnInit(): void {
    this.seoService.setPage(
      this.transloco.translate('discover.pageTitle'),
      this.transloco.translate('discover.seoDescription'),
    );
    this.listingService.loadLatest();
  }

  selectCategory(category: string | null): void {
    this.selectedCategory.set(category);
    if (category) {
      this.listingService.search({ category });
    } else {
      this.listingService.loadLatest();
    }
  }
}
