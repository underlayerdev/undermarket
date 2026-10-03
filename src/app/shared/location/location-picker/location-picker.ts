import { Component, computed, effect, input, linkedSignal, output, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import {
  ButtonComponent,
  IconComponent,
  SearchInputComponent,
  SelectComponent,
} from '@underlayerdev/ui';
import type { SearchSuggestion, SelectOption } from '@underlayerdev/ui';
import { toLocationArea } from '../../../domain/location/geohash.util';
import type {
  LocationArea,
  LocationSource,
  LocationSuggestion,
  SearchLocation,
} from '../../../domain/location/location.model';
import { MapComponent } from '../../map/map';

const QUERY_DEBOUNCE_MS = 300;

export interface LocationPickerConfirmedEvent {
  area: LocationArea;
  /** Only ever set in confirm mode (radiusOptions non-empty) — see the class doc below. */
  radiusKm?: number;
  source: LocationSource;
}

/**
 * Presentational for the actual geocoding — never injects
 * GEOCODING_PROVIDER/GEOLOCATION_PROVIDER itself. The caller owns fetching
 * suggestions/resolving the current location and feeds the results back in
 * via inputs, matching the rest of shared/'s components.
 *
 * Two modes, switched automatically by whether `radiusOptions` is non-empty:
 *
 * - **No radius** (the default — settings-account-profile, onboarding):
 *   the original "fires as soon as you pick" picker. `suggestionSelected`/
 *   `useCurrentLocationRequested` emit immediately; no internal map, no
 *   confirm step.
 * - **With radius** (search-location-bar): a pick — a search suggestion,
 *   or a freshly resolved current location fed back via
 *   `resolvedCurrentArea` — only stages a pending preview, shown on an
 *   internal map (with the radius's coverage circle overlaid once one is
 *   set). The caller only hears about it when the user clicks "Set
 *   location", via `confirmed`. That's also what makes changing the radius
 *   select here not take effect immediately: it only stages
 *   `pendingRadiusKm` until the same click.
 */
@Component({
  selector: 'um-location-picker',
  imports: [
    TranslocoDirective,
    SearchInputComponent,
    ButtonComponent,
    IconComponent,
    SelectComponent,
    MapComponent,
  ],
  styleUrl: './location-picker.scss',
  templateUrl: './location-picker.html',
})
export class LocationPickerComponent {
  readonly searchLocation = input<SearchLocation | null>(null);
  // Label to be used in search input component for form elements.
  readonly label = input<string | null>(null);
  // Placeholder for the search input component.
  readonly placeholder = input('');
  readonly suggestions = input<LocationSuggestion[]>([]);
  readonly isResolvingCurrentLocation = input(false);
  readonly showUseCurrentLocation = input(true);
  // Confirm mode's radius choices, already translated — empty (the
  // default) means no radius control and no map/confirm step at all; see
  // the class doc above.
  readonly radiusOptions = input<SelectOption[]>([]);
  // Confirm mode only: fed by the parent once it resolves a fresh current
  // location (this component never injects a geolocation provider itself)
  // — becomes the new pending preview, as if the user had picked it from
  // the search results.
  readonly resolvedCurrentArea = input<LocationArea | null>(null);

  readonly queryChanged = output<string>();
  readonly suggestionSelected = output<LocationSuggestion>();
  readonly useCurrentLocationRequested = output<void>();
  readonly confirmed = output<LocationPickerConfirmedEvent>();

  protected readonly confirmMode = computed(() => this.radiusOptions().length > 0);

  // linkedSignal (not signal) because searchLocation can arrive/change after
  // this component already exists — e.g. settings-account seeds it from the
  // profile, which loads asynchronously — so it must keep tracking it until
  // the user actually types something themselves.
  readonly query = linkedSignal(() => this.searchLocation()?.displayName ?? '');

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

  // Confirm-mode-only state below — never read outside confirmMode(), so
  // leaving them populated when confirmMode() is false is harmless.
  readonly pendingArea = signal<LocationArea | null>(null);
  readonly pendingRadiusKm = signal<number | null>(null);
  private readonly pendingSource = signal<LocationSource>('saved');

  protected readonly radiusValue = computed(() => {
    const km = this.pendingRadiusKm();
    return km != null ? String(km) : null;
  });
  protected readonly canConfirm = computed(() => this.pendingArea() !== null);

  private debounceTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // Re-seed the pending pick from whatever's currently committed — e.g.
    // opening "Change location" again should preview the already-set
    // point/radius, not start blank. A no-op outside confirm mode.
    effect(() => {
      const current = this.searchLocation();
      this.pendingArea.set(current ?? null);
      this.pendingRadiusKm.set(current?.radiusKm ?? null);
      this.pendingSource.set('saved');
    });

    // A freshly resolved current location always wins as the new pending
    // pick, overriding whatever was staged before.
    effect(() => {
      const resolved = this.resolvedCurrentArea();
      if (resolved) {
        this.pendingArea.set(resolved);
        this.pendingSource.set('browser-geolocation');
      }
    });
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.queryChanged.emit(value), QUERY_DEBOUNCE_MS);
  }

  onResultSelected(result: SearchSuggestion): void {
    const suggestion = this.suggestionsById().get(result.value);
    if (!suggestion) return;

    if (this.confirmMode()) {
      this.pendingArea.set(toLocationArea(suggestion));
      this.pendingSource.set('saved');
    } else {
      this.suggestionSelected.emit(suggestion);
    }
  }

  onUseCurrentLocationRequested(): void {
    this.useCurrentLocationRequested.emit();
  }

  onRadiusChange(value: string | null): void {
    const radiusKm = value ? parseInt(value, 10) : NaN;
    if (Number.isFinite(radiusKm)) this.pendingRadiusKm.set(radiusKm);
  }

  onConfirm(): void {
    const area = this.pendingArea();
    if (!area) return;
    this.confirmed.emit({
      area,
      radiusKm: this.pendingRadiusKm() ?? undefined,
      source: this.pendingSource(),
    });
  }
}
