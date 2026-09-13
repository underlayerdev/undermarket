import { Component, computed, effect, input, output, signal } from '@angular/core';
import { ButtonComponent, IconComponent, ModalComponent, SelectComponent } from '@underlayerdev/ui';
import type { SelectOption } from '@underlayerdev/ui';
import { LocationPickerComponent } from '../location-picker/location-picker';
import { toLocationArea } from '../../../domain/location/geohash.util';
import type {
  LocationArea,
  LocationSuggestion,
  SearchLocation,
} from '../../../domain/location/location.model';

// Compact "📍 Palermo, Buenos Aires — Within 10 km" bar for discover/search.
// Folds the first-run prompt into the same modal rather than a separate
// component — it's one behavioral branch (searchLocation() === null) of the
// same "pick/change a location" UI, not a different one.
@Component({
  selector: 'um-search-location-bar',
  imports: [
    LocationPickerComponent,
    ModalComponent,
    SelectComponent,
    ButtonComponent,
    IconComponent,
  ],
  templateUrl: './search-location-bar.html',
})
export class SearchLocationBarComponent {
  readonly searchLocation = input<SearchLocation | null>(null);
  readonly pickerSuggestions = input<LocationSuggestion[]>([]);
  readonly isResolvingCurrentLocation = input(false);
  readonly radiusOptions = input<SelectOption[]>([]);

  readonly changeLocationLabel = input('Change location');
  readonly firstRunTitle = input('Where should we search?');
  readonly locationPickerPlaceholder = input('Search city, neighborhood or area');
  readonly useCurrentLocationLabel = input('Use my current location');
  readonly radiusLabel = input('Search radius');
  readonly withinRadiusLabel = input('');

  readonly queryChanged = output<string>();
  readonly areaSelected = output<LocationArea>();
  readonly radiusChanged = output<number>();
  readonly useCurrentLocationRequested = output<void>();

  readonly open = signal(false);
  readonly isFirstRun = computed(() => this.searchLocation() === null);
  readonly radiusValue = computed(() => {
    const radiusKm = this.searchLocation()?.radiusKm;
    return radiusKm != null ? String(radiusKm) : null;
  });

  constructor() {
    effect(() => {
      if (this.isFirstRun()) this.open.set(true);
    });
  }

  onAreaPicked(suggestion: LocationSuggestion): void {
    this.areaSelected.emit(toLocationArea(suggestion));
    this.open.set(false);
  }

  onRadiusChange(value: string | null): void {
    const radiusKm = value ? parseInt(value, 10) : NaN;
    if (Number.isFinite(radiusKm)) this.radiusChanged.emit(radiusKm);
  }
}
