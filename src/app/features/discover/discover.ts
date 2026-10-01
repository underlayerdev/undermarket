import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ToastService } from '@underlayerdev/ui';
import type { CategoryPickerNode, SelectOption } from '@underlayerdev/ui';
import { CategoryService } from '../../application/category/category.service';
import { ListingService } from '../../application/services/listing.service';
import { LocationService } from '../../application/services/location.service';
import { toLocationErrorMessage } from '../../application/services/location-error.util';
import { SearchLocationService } from '../../application/services/search-location.service';
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

@Component({
  selector: 'um-discover',
  imports: [
    CategoryFilterChipsComponent,
    TranslocoDirective,
    ListingGridComponent,
    SearchLocationBarComponent,
    SortComponent,
  ],
  providers: [ToastService],
  templateUrl: './discover.html',
  styleUrl: 'discover.scss',
})
export class DiscoverComponent implements OnInit {
  protected readonly listingService = inject(ListingService);
  protected readonly searchLocationService = inject(SearchLocationService);
  private readonly categoryService = inject(CategoryService);
  private readonly locationService = inject(LocationService);
  private readonly seoService = inject(SeoService);
  private readonly transloco = inject(TranslocoService);
  private readonly toastService = inject(ToastService);

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

  readonly locationSuggestions = signal<LocationSuggestion[]>([]);
  readonly isResolvingCurrentLocation = signal(false);

  readonly sortOptions = computed<SelectOption[]>(() => {
    this.transloco.activeLang();
    return LISTING_SORT_OPTIONS.filter(({ value }) => ['newest', 'nearest'].includes(value)).map(
      ({ value, labelKey }) => ({
        value,
        label: this.transloco.translate(labelKey),
      }),
    );
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
      const location = this.searchLocationService.searchLocation();
      const categoryId = this.selectedCategoryId();
      void this.runSearch(location, categoryId);
    });
  }

  ngOnInit(): void {
    this.seoService.setPage(
      this.transloco.translate('discover.pageTitle'),
      this.transloco.translate('discover.seoDescription'),
    );
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
  ): Promise<void> {
    if (location) {
      await this.listingService.searchNearby({
        center: location,
        radiusKm: location.radiusKm,
        categoryId: categoryId ?? undefined,
      });
    } else if (categoryId) {
      await this.listingService.search({ categoryId });
    } else {
      await this.listingService.loadLatest();
    }
  }
}
