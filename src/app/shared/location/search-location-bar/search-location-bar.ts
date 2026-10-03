import { Component, computed, effect, inject, output, signal } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ButtonComponent, IconComponent, ModalComponent } from '@underlayerdev/ui';
import type { SelectOption } from '@underlayerdev/ui';
import { LocationPickerComponent } from '../location-picker/location-picker';
import type { LocationPickerConfirmedEvent } from '../location-picker/location-picker';
import { LocationService } from '../../../application/services/location.service';
import { SearchLocationService } from '../../../application/services/search-location.service';
import { toLocationErrorMessage } from '../../../application/services/location-error.util';
import { SEARCH_RADIUS_OPTIONS_KM } from '../../../domain/location/geohash.util';
import type { LocationArea, LocationSuggestion } from '../../../domain/location/location.model';

// Compact "📍 Palermo, Buenos Aires — Within 10 km" bar for discover/search/
// home. Folds the first-run prompt into the same modal rather than a
// separate component — it's one behavioral branch (searchLocation() ===
// null) of the same "pick/change a location" UI, not a different one.
//
// Fully self-sufficient: injects SearchLocationService/LocationService
// itself rather than taking the current location/suggestions/radius as
// inputs and emitting events for the page to handle — every page that used
// this wired up the exact same handlers, so there was nothing actually
// page-specific left to parameterize. LocationPickerComponent (its child)
// stays presentational either way; this component is just the one now
// playing the "owns the side effects, feeds pure inputs down" role instead
// of each page doing it.
//
// Supplies LocationPickerComponent's `radiusOptions` — the one thing that
// switches it into "confirm mode": a pick (search or current-location) only
// stages a pending preview on the picker's own map, and this bar only
// actually commits the location (and the radius, if changed) once the user
// clicks "Set location" there (`confirmed`), never on every intermediate
// pick/select change.
@Component({
  selector: 'um-search-location-bar',
  imports: [
    LocationPickerComponent,
    ModalComponent,
    ButtonComponent,
    IconComponent,
    TranslocoDirective,
  ],
  templateUrl: './search-location-bar.html',
  styleUrl: 'search-location-bar.scss',
})
export class SearchLocationBarComponent {
  private readonly searchLocationService = inject(SearchLocationService);
  private readonly locationService = inject(LocationService);
  private readonly transloco = inject(TranslocoService);

  // Surfaced instead of swallowed so the page can still toast it — toasting
  // itself stays a page/UI concern, not something to bake in here.
  readonly locationErrorOccurred = output<string>();

  protected readonly searchLocation = this.searchLocationService.searchLocation;
  protected readonly locationSuggestions = signal<LocationSuggestion[]>([]);
  protected readonly isResolvingCurrentLocation = signal(false);
  // Fed into the picker's resolvedCurrentArea input once a current-location
  // resolve succeeds — the picker only previews it; this bar still doesn't
  // persist anything until the picker's "Set location" is clicked.
  readonly resolvedCurrentArea = signal<LocationArea | null>(null);

  readonly open = signal(false);
  readonly isFirstRun = computed(() => this.searchLocation() === null);

  protected readonly radiusOptions = computed<SelectOption[]>(() => {
    this.transloco.activeLang();
    return SEARCH_RADIUS_OPTIONS_KM.map((km) => ({
      value: String(km),
      label: this.transloco.translate('location.radiusOptionLabel', { value: km }),
    }));
  });

  protected readonly withinRadiusLabel = computed(() =>
    this.transloco.translate('location.withinRadius', {
      value: this.searchLocationService.radiusKm(),
    }),
  );

  constructor() {
    effect(() => {
      if (this.isFirstRun()) this.open.set(true);
    });
  }

  async onQueryChanged(query: string): Promise<void> {
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

  async onConfirmed(result: LocationPickerConfirmedEvent): Promise<void> {
    this.open.set(false);
    this.resolvedCurrentArea.set(null);
    await this.searchLocationService.setSearchLocation(result.area, result.source);
    if (result.radiusKm != null) await this.searchLocationService.setRadius(result.radiusKm);
  }

  async onUseCurrentLocationRequested(): Promise<void> {
    this.isResolvingCurrentLocation.set(true);
    try {
      this.resolvedCurrentArea.set(await this.locationService.resolveCurrentArea());
    } catch (err) {
      this.locationErrorOccurred.emit(toLocationErrorMessage(err, this.transloco));
    } finally {
      this.isResolvingCurrentLocation.set(false);
    }
  }
}
