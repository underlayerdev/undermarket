import { Component, computed, inject, OnInit } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ToastService } from '@underlayerdev/ui';
import type { SelectOption } from '@underlayerdev/ui';
import { createSearchQueryStrategy } from '../../application/listing/listing-query-strategies';
import {
  LISTING_QUERY_FN,
  ListingResultsStore,
} from '../../application/listing/listing-results.store';
import { LISTING_REPOSITORY } from '../../core/configuration/tokens';
import { SeoService } from '../../core/seo/seo.service';
import { LISTING_SORT_OPTIONS } from '../../domain/listing/listing-query.util';
import type { ListingSortOption } from '../../domain/listing/listing-query.util';
import type { ListingRepository } from '../../domain/listing/listing.repository';
import { CategoryFilterChipsComponent } from '../../shared/category/category-filter-chips/category-filter-chips';
import { ListingGridComponent } from '../../shared/listing/listing-grid/listing-grid';
import { SearchLocationBarComponent } from '../../shared/location/search-location-bar/search-location-bar';
import { SortComponent } from '../../shared/sort/sort';

@Component({
  selector: 'um-discover',
  imports: [
    CategoryFilterChipsComponent,
    TranslocoDirective,
    ListingGridComponent,
    SearchLocationBarComponent,
    SortComponent,
  ],
  providers: [
    ToastService,
    ListingResultsStore,
    {
      provide: LISTING_QUERY_FN,
      useFactory: (repository: ListingRepository) => createSearchQueryStrategy(repository),
      deps: [LISTING_REPOSITORY],
    },
  ],
  templateUrl: './discover.html',
  styleUrl: 'discover.scss',
})
export class DiscoverComponent implements OnInit {
  protected readonly store = inject(ListingResultsStore);
  private readonly seoService = inject(SeoService);
  private readonly transloco = inject(TranslocoService);
  private readonly toastService = inject(ToastService);

  // Discover intentionally offers fewer sort choices than Search — "oldest"
  // and "title-asc" don't make sense for a browse-the-latest page.
  protected readonly sortOptions = computed<SelectOption[]>(() => {
    this.transloco.activeLang();
    return LISTING_SORT_OPTIONS.filter(({ value }) => ['newest', 'nearest'].includes(value)).map(
      ({ value, labelKey }) => ({
        value,
        label: this.transloco.translate(labelKey),
      }),
    );
  });

  ngOnInit(): void {
    this.seoService.setPage(
      this.transloco.translate('discover.pageTitle'),
      this.transloco.translate('discover.seoDescription'),
    );
  }

  onLocationError(message: string): void {
    this.toastService.error(message);
  }

  onSortChange(sort: string | null): void {
    this.store.setSort(sort as ListingSortOption | null);
  }
}
