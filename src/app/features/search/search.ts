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
  SearchInputComponent,
} from '@underlayerdev/ui';
import type { CategoryPickerNode, SearchSuggestion, SelectOption } from '@underlayerdev/ui';
import { CategoryService } from '../../application/category/category.service';
import { ListingService } from '../../application/services/listing.service';
import { LocationService } from '../../application/services/location.service';
import { toLocationErrorMessage } from '../../application/services/location-error.util';
import { SearchLocationService } from '../../application/services/search-location.service';
import { NavigationService } from '../../core/navigation/navigation.service';
import { SeoService } from '../../core/seo/seo.service';
import { SEARCH_RADIUS_OPTIONS_KM } from '../../domain/location/geohash.util';
import type {
  LocationArea,
  LocationSuggestion,
  SearchLocation,
} from '../../domain/location/location.model';
import { LISTING_SORT_OPTIONS, sortListings } from '../../domain/listing/listing-query.util';
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
  private readonly categoryService = inject(CategoryService);
  private readonly locationService = inject(LocationService);
  private readonly seoService = inject(SeoService);
  private readonly transloco = inject(TranslocoService);
  private readonly toastService = inject(ToastService);
  private readonly navigationService = inject(NavigationService);

  /** Bound to the `q` query param via withComponentInputBinding(). */
  readonly q = input<string>('');

  readonly query = signal('');
  readonly selectedCategoryId = signal<string | null>(null);
  readonly sortOption = signal<string | null>('nearest');

  readonly categoryFilterNodes = computed<CategoryPickerNode[]>(() => {
    this.transloco.activeLang();
    return this.categoryService.orderedTree().map((node) => ({
      id: node.categoryId,
      parentId: node.parentId,
      label: this.transloco.translate(`category.${node.categoryId}`),
      // Root-only — see new-listing.ts's categoryPickerNodes for why.
      icon: node.depth === 0 ? node.icon : undefined,
      isLeaf: node.isLeaf,
    }));
  });
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
    void this.categoryService.ensureLoaded();

    effect(() => {
      const incoming = this.q();
      if (incoming && incoming !== this.query()) {
        this.query.set(incoming);
        this.onSearch();
      }
    });

    // Location and category re-run the search reactively (a chip click is
    // already a single, immediate action — no separate "confirm" step like
    // the old dropdown had); the text query stays explicit
    // (submit/suggestion/button), matching how this page worked before
    // location existed.
    effect(() => {
      const location = this.searchLocationService.searchLocation();
      const categoryId = this.selectedCategoryId();
      void this.runSearch(location, categoryId, untracked(this.query));
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
      this.selectedCategoryId(),
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

  goBack(): void {
    this.navigationService.goBackOr(['/home']);
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
    categoryId: string | null,
    query: string,
  ): Promise<void> {
    if (location) {
      await this.listingService.searchNearby({
        center: location,
        radiusKm: location.radiusKm,
        categoryId: categoryId ?? undefined,
        query: query || undefined,
      });
    } else {
      await this.listingService.search({
        query: query || undefined,
        categoryId: categoryId ?? undefined,
      });
    }
  }
}
