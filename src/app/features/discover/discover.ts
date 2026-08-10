import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ListingService } from '../../application/services/listing.service';
import { SeoService } from '../../core/seo/seo.service';
import { CATEGORIES } from '../../domain/category/category.model';
import { ListingPricePipe } from '../../shared/pipes/listing-price.pipe';
import { createListingSlug } from '../../shared/utils/slugify';
import { CardComponent, PillComponent } from '@underlayerdev/ui';

@Component({
  selector: 'um-discover',
  standalone: true,
  imports: [RouterLink, CardComponent, PillComponent, ListingPricePipe],
  templateUrl: './discover.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscoverComponent implements OnInit {
  protected readonly listingService = inject(ListingService);
  private readonly seoService = inject(SeoService);

  readonly createListingSlug = createListingSlug;
  readonly categories = CATEGORIES;
  readonly selectedCategory = signal<string | null>(null);

  ngOnInit(): void {
    this.seoService.setPage('Discover', 'Browse secondhand listings by category on Undermarket.');
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
