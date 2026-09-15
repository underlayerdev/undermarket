import { Component, computed, input, linkedSignal, output } from '@angular/core';
import { ButtonComponent, IconComponent, SearchInputComponent } from '@underlayerdev/ui';
import type { SearchSuggestion } from '@underlayerdev/ui';
import type { LocationSuggestion } from '../../../domain/location/location.model';

const QUERY_DEBOUNCE_MS = 300;

// Presentational only — never injects GEOCODING_PROVIDER/GEOLOCATION_PROVIDER
// itself. The caller owns fetching suggestions/resolving the current
// location and feeds the results back in via inputs, matching the rest of
// shared/'s components.
@Component({
  selector: 'um-location-picker',
  imports: [SearchInputComponent, ButtonComponent, IconComponent],
  styleUrl: './location-picker.scss',
  templateUrl: './location-picker.html',
})
export class LocationPickerComponent {
  readonly label = input<string | null>(null);
  readonly placeholder = input('');
  readonly initialQuery = input('');
  readonly suggestions = input<LocationSuggestion[]>([]);
  readonly isResolvingCurrentLocation = input(false);
  readonly showUseCurrentLocation = input(true);
  readonly useCurrentLocationLabel = input('Use my current location');

  readonly queryChanged = output<string>();
  readonly suggestionSelected = output<LocationSuggestion>();
  readonly useCurrentLocationRequested = output<void>();

  // linkedSignal (not signal) because initialQuery can arrive after this
  // component already exists — e.g. settings-account seeds it from the
  // profile, which loads asynchronously — so it must keep tracking
  // initialQuery() until the user actually types something themselves.
  readonly query = linkedSignal(() => this.initialQuery());

  private readonly suggestionsById = computed(
    () => new Map(this.suggestions().map((suggestion) => [suggestion.id, suggestion])),
  );

  readonly searchResults = computed<SearchSuggestion[]>(() =>
    this.suggestions().map((suggestion) => ({
      value: suggestion.id,
      label: suggestion.displayName,
      icon: 'map_pin',
    })),
  );

  private debounceTimer: ReturnType<typeof setTimeout> | undefined;

  onQueryChange(value: string): void {
    this.query.set(value);
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.queryChanged.emit(value), QUERY_DEBOUNCE_MS);
  }

  onResultSelected(result: SearchSuggestion): void {
    const suggestion = this.suggestionsById().get(result.value);
    if (suggestion) this.suggestionSelected.emit(suggestion);
  }
}
