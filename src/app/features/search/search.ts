import { Location } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import {
  ToastService,
  ButtonComponent,
  IconComponent,
  PillComponent,
  SearchInputComponent,
  SelectComponent,
} from '@underlayerdev/ui';
import type { SearchSuggestion, SelectOption } from '@underlayerdev/ui';
import { ListingService } from '../../application/services/listing.service';
import { LocationService } from '../../application/services/location.service';
import { toLocationErrorMessage } from '../../application/services/location-error.util';
import { SearchLocationService } from '../../application/services/search-location.service';
import { SeoService } from '../../core/seo/seo.service';
import { CATEGORIES } from '../../domain/category/category.model';
import { SEARCH_RADIUS_OPTIONS_KM } from '../../domain/location/geohash.util';
import type {
  LocationArea,
  LocationSuggestion,
  SearchLocation,
} from '../../domain/location/location.model';
import { LISTING_SORT_OPTIONS, sortListings } from '../../domain/listing/listing-query.util';
import { ListingGridComponent } from '../../shared/listing/listing-grid/listing-grid';
import { SearchLocationBarComponent } from '../../shared/location/search-location-bar/search-location-bar';
import { SortComponent } from '../../shared/sort/sort';
import { addRecentSearch, getRecentSearches } from '../../shared/search/recent-searches.util';

@Component({
  selector: 'um-search',
  imports: [
    ButtonComponent,
    IconComponent,
    PillComponent,
    SelectComponent,
    SearchInputComponent,
    TranslocoDirective,
    ListingGridComponent,
    SearchLocationBarComponent,
    SortComponent,
  ],
  providers: [ToastService],
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class SearchComponent implements OnInit {
  // Separate history bucket from profile-listings' own search input so
  // unrelated searches never mix in the same recent-searches list.
  private static readonly HISTORY_KEY = 'listings';

  protected readonly listingService = inject(ListingService);
  protected readonly searchLocationService = inject(SearchLocationService);
  private readonly locationService = inject(LocationService);
  private readonly seoService = inject(SeoService);
  private readonly transloco = inject(TranslocoService);
  private readonly toastService = inject(ToastService);
  private readonly location = inject(Location);

  readonly categoryOptions: SelectOption[] = CATEGORIES.map((category) => ({
    value: category,
    label: category,
  }));

  /** Bound to the `q` query param via withComponentInputBinding(). */
  readonly q = input<string>('');

  readonly query = signal('');
  readonly selectedCategory = signal<string | null>(null);
  readonly sortOption = signal<string | null>('nearest');
  private readonly recentSearches = signal(getRecentSearches(SearchComponent.HISTORY_KEY));
  readonly recentSearchSuggestions = computed<SearchSuggestion[]>(() =>
    this.recentSearches().map((recentQuery) => ({ value: recentQuery, label: recentQuery })),
  );

  readonly locationSuggestions = signal<LocationSuggestion[]>([]);
  readonly isResolvingCurrentLocation = signal(false);

  readonly sortOptions = computed<SelectOption[]>(() => {
    this.transloco.activeLang();
    return LISTING_SORT_OPTIONS.map(({ value, labelKey }) => ({
      value,
      label: this.transloco.translate(labelKey),
    }));
  });

  readonly radiusOptions = computed<SelectOption[]>(() => {
    this.transloco.activeLang();
    return SEARCH_RADIUS_OPTIONS_KM.map((km) => ({
      value: String(km),
      label: this.transloco.translate('location.radiusOptionLabel', { value: km }),
    }));
  });

  readonly withinRadiusLabel = computed(() =>
    this.transloco.translate('location.withinRadius', {
      value: this.searchLocationService.radiusKm(),
    }),
  );

  readonly sortedListings = computed(() =>
    sortListings(
      this.listingService.listings(),
      this.sortOption(),
      this.searchLocationService.searchLocation() ?? undefined,
    ),
  );

  constructor() {
    effect(() => {
      const incoming = this.q();
      if (incoming && incoming !== this.query()) {
        this.query.set(incoming);
        this.onSearch();
      }
    });

    // Only the search location/radius re-runs the search reactively — query
    // and category stay explicit (submit/suggestion/button), matching how
    // this page worked before location existed: picking a category alone
    // doesn't search until the query or a category is (re-)submitted.
    effect(() => {
      const location = this.searchLocationService.searchLocation();
      void this.runSearch(location, untracked(this.selectedCategory), untracked(this.query));
    });
  }

  ngOnInit(): void {
    this.seoService.setPage(
      this.transloco.translate('search.pageTitle'),
      this.transloco.translate('search.seoDescription'),
    );
  }

  onSearch(): void {
    void this.runSearch(
      this.searchLocationService.searchLocation(),
      this.selectedCategory(),
      this.query(),
    );
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

  clearCategory(): void {
    this.selectedCategory.set(null);
    this.onSearch();
  }

  goBack(): void {
    this.location.back();
  }

  async onLocationQueryChanged(query: string): Promise<void> {
    if (!query.trim()) {
      this.locationSuggestions.set([]);
      return;
    }
    try {
      this.locationSuggestions.set(await this.locationService.searchAreas(query));
    } catch {
      this.locationSuggestions.set([]);
    }
  }

  async onAreaSelected(area: LocationArea): Promise<void> {
    await this.searchLocationService.setSearchLocation(area, 'saved');
  }

  async onRadiusChanged(radiusKm: number): Promise<void> {
    await this.searchLocationService.setRadius(radiusKm);
  }

  async onUseCurrentLocationRequested(): Promise<void> {
    this.isResolvingCurrentLocation.set(true);
    try {
      await this.searchLocationService.useCurrentLocation();
    } catch (err) {
      this.toastService.error(toLocationErrorMessage(err, this.transloco));
    } finally {
      this.isResolvingCurrentLocation.set(false);
    }
  }

  private async runSearch(
    location: SearchLocation | null,
    category: string | null,
    query: string,
  ): Promise<void> {
    if (location) {
      await this.listingService.searchNearby({
        center: location,
        radiusKm: location.radiusKm,
        category: category ?? undefined,
        query: query || undefined,
      });
    } else {
      await this.listingService.search({
        query: query || undefined,
        category: category ?? undefined,
      });
    }
  }
}
