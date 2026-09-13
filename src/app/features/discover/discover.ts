import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ToastService, PillComponent } from '@underlayerdev/ui';
import type { SelectOption } from '@underlayerdev/ui';
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

@Component({
  selector: 'um-discover',
  imports: [
    PillComponent,
    TranslocoDirective,
    ListingGridComponent,
    SearchLocationBarComponent,
    SortComponent,
  ],
  providers: [ToastService],
  templateUrl: './discover.html',
})
export class DiscoverComponent implements OnInit {
  protected readonly listingService = inject(ListingService);
  protected readonly searchLocationService = inject(SearchLocationService);
  private readonly locationService = inject(LocationService);
  private readonly seoService = inject(SeoService);
  private readonly transloco = inject(TranslocoService);
  private readonly toastService = inject(ToastService);

  readonly categories = CATEGORIES;
  readonly selectedCategory = signal<string | null>(null);
  readonly sortOption = signal<string | null>('nearest');

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
      const location = this.searchLocationService.searchLocation();
      const category = this.selectedCategory();
      void this.runSearch(location, category);
    });
  }

  ngOnInit(): void {
    this.seoService.setPage(
      this.transloco.translate('discover.pageTitle'),
      this.transloco.translate('discover.seoDescription'),
    );
  }

  selectCategory(category: string | null): void {
    this.selectedCategory.set(category);
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

  private async runSearch(location: SearchLocation | null, category: string | null): Promise<void> {
    if (location) {
      await this.listingService.searchNearby({
        center: location,
        radiusKm: location.radiusKm,
        category: category ?? undefined,
      });
    } else if (category) {
      await this.listingService.search({ category });
    } else {
      await this.listingService.loadLatest();
    }
  }
}
