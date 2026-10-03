import { Component, computed, effect, inject, input, OnInit, signal } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import {
  ButtonComponent,
  IconComponent,
  SearchInputComponent,
  ToastService,
} from '@underlayerdev/ui';
import type { SearchSuggestion, SelectOption } from '@underlayerdev/ui';
import { createSearchQueryStrategy } from '../../application/listing/listing-query-strategies';
import {
  LISTING_QUERY_FN,
  ListingResultsStore,
} from '../../application/listing/listing-results.store';
import { LISTING_REPOSITORY } from '../../core/configuration/tokens';
import { NavigationService } from '../../core/navigation/navigation.service';
import { SeoService } from '../../core/seo/seo.service';
import { LISTING_SORT_OPTIONS } from '../../domain/listing/listing-query.util';
import type { ListingSortOption } from '../../domain/listing/listing-query.util';
import type { ListingRepository } from '../../domain/listing/listing.repository';
import { CategoryFilterChipsComponent } from '../../shared/category/category-filter-chips/category-filter-chips';
import { ListingGridComponent } from '../../shared/listing/listing-grid/listing-grid';
import { SearchLocationBarComponent } from '../../shared/location/search-location-bar/search-location-bar';
import { SortComponent } from '../../shared/sort/sort';
import { addRecentSearch, getRecentSearches } from '../../shared/search/recent-searches.util';

@Component({
  selector: 'um-search',
  imports: [
    ButtonComponent,
    CategoryFilterChipsComponent,
    IconComponent,
    SearchInputComponent,
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
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class SearchComponent implements OnInit {
  // Separate history bucket from profile-listings' own search input so
  // unrelated searches never mix in the same recent-searches list.
  private static readonly HISTORY_KEY = 'listings';

  protected readonly store = inject(ListingResultsStore);
  private readonly seoService = inject(SeoService);
  private readonly transloco = inject(TranslocoService);
  private readonly toastService = inject(ToastService);
  private readonly navigationService = inject(NavigationService);

  /** Bound to the `q` query param via withComponentInputBinding(). */
  readonly q = input<string>('');

  // The text query is page-owned (bound to the search input) rather than
  // living in the store directly — unlike category/sort/location, it stays
  // explicit (submit/suggestion/button), matching how this page worked
  // before location existed. onSearch() below is what pushes it into the
  // store, which is what actually re-runs the search.
  readonly query = signal('');

  private readonly recentSearches = signal(getRecentSearches(SearchComponent.HISTORY_KEY));
  readonly recentSearchSuggestions = computed<SearchSuggestion[]>(() =>
    this.recentSearches().map((recentQuery) => ({ value: recentQuery, label: recentQuery })),
  );

  readonly sortOptions = computed<SelectOption[]>(() => {
    this.transloco.activeLang();
    return LISTING_SORT_OPTIONS.map(({ value, labelKey }) => ({
      value,
      label: this.transloco.translate(labelKey),
    }));
  });

  constructor() {
    effect(() => {
      const incoming = this.q();
      if (incoming && incoming !== this.query()) {
        this.query.set(incoming);
        this.onSearch();
      }
    });
  }

  ngOnInit(): void {
    this.seoService.setPage(
      this.transloco.translate('search.pageTitle'),
      this.transloco.translate('search.seoDescription'),
    );
  }

  onSearch(): void {
    this.store.setQuery(this.query().trim() || undefined);
  }

  onSearchSubmit(value: string): void {
    this.recordRecentSearch(value);
    this.onSearch();
  }

  onSuggestionSelected(suggestion: SearchSuggestion): void {
    this.recordRecentSearch(suggestion.value);
    this.onSearch();
  }

  private recordRecentSearch(value: string): void {
    const trimmed = value.trim();
    if (!trimmed) return;
    addRecentSearch(SearchComponent.HISTORY_KEY, trimmed);
    this.recentSearches.set(getRecentSearches(SearchComponent.HISTORY_KEY));
  }

  goBack(): void {
    this.navigationService.goBackOr(['/home']);
  }

  onLocationError(message: string): void {
    this.toastService.error(message);
  }

  onSortChange(sort: string | null): void {
    this.store.setSort(sort as ListingSortOption | null);
  }
}
