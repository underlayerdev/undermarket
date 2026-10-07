import { Component, computed, effect, input, linkedSignal, output, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import {
  ButtonComponent,
  IconComponent,
  SearchInputComponent,
  SelectComponent,
} from '@underlayerdev/ui';
import type { SearchSuggestion, SelectOption } from '@underlayerdev/ui';
import { hasValidCoordinates, toLocationArea } from '../../../domain/location/geohash.util';
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
  /** Only ever set when radiusOptions is non-empty — see the class doc below. */
  radiusKm?: number;
  source: LocationSource;
}

/**
 * What `searchLocation` actually needs to be: every caller reads
 * `displayName` off it to seed the search box, so a lighter place value with
 * no coordinates (e.g. a user's public `profileCity`) is always a valid
 * input — it just won't seed the map (see `showMap`'s doc above), since
 * there's nothing to plot.
 */
export type SearchLocationLike = Pick<SearchLocation, 'displayName'> & Partial<SearchLocation>;

function hasCoordinates(location: SearchLocationLike): location is LocationArea {
  return hasValidCoordinates(location);
}

/**
 * Presentational for the actual geocoding — never injects
 * GEOCODING_PROVIDER/GEOLOCATION_PROVIDER itself. The caller owns fetching
 * suggestions/resolving the current location and feeds the results back in
 * via inputs, matching the rest of shared/'s components.
 *
 * Four independent axes, each controlled by its own input — no single mode
 * flag derives any of the others:
 *
 * - Search input + current-location button: always rendered.
 * - Map (`showMap`, default `true`): shown whenever there's a pending area
 *   with real coordinates to plot, nothing else. A `searchLocation` with no
 *   coordinates (e.g. settings-account-profile's public-profile city, which
 *   only ever has `displayName`/`city`/`region`/`countryCode`) is never used
 *   to seed the map — it just starts blank until an actual pick/resolve
 *   gives it a real `LocationArea`. `showMap="false"` still fully suppresses
 *   it for callers that never want it at all.
 * - Radius circle (`showRadius`, default `true`): drawn only when also
 *   `radiusOptions` is non-empty and a radius value is actually pending —
 *   otherwise the map still shows, just with no circle.
 * - "Set location" confirm button (`showConfirmButton`, default `false`):
 *   when true, a pick — a search suggestion, or a freshly resolved current
 *   location fed back via `resolvedCurrentArea` — only stages a pending
 *   preview (`pendingArea`/`pendingRadiusKm`); the caller only hears about
 *   it once the user clicks "Set location", via `confirmed`. `search-
 *   location-bar` and `settings-account-profile` both set this (they're
 *   modal usages); `onboarding-location` leaves it at the `false` default
 *   and keeps firing `suggestionSelected`/`useCurrentLocationRequested`
 *   immediately as before.
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
  readonly searchLocation = input<SearchLocationLike | null>(null);
  // Label to be used in search input component for form elements.
  readonly label = input<string | null>(null);
  // Placeholder for the search input component.
  readonly placeholder = input('');
  /**
   * Suggestions to show when user types a location.
   */
  readonly suggestions = input<LocationSuggestion[]>([]);
  readonly isResolvingCurrentLocation = input(false);
  /**
   * When true we show the button to geolocate the user.
   */
  readonly showUseCurrentLocation = input(true);
  /**
   * When true we show map with the selected location.
   */
  readonly showMap = input(true);
  // Gates only the map's coverage-circle overlay, together with radiusOptions
  // being non-empty — independent of showConfirmButton, so neither mode is
  // forced to show (or hide) it.
  readonly showRadius = input(true);
  // Radius choices, already translated — empty (the default) means no
  // radius select and no circle overlay on the map; see the class doc above.
  readonly radiusOptions = input<SelectOption[]>([]);
  // Stage-then-confirm picks and show the "Set location" button; see the
  // class doc above.
  readonly showConfirmButton = input(false);
  // Only meaningful when showConfirmButton is true: fed by the parent once
  // it resolves a fresh current location (this component never injects a
  // geolocation provider itself) — becomes the new pending preview, as if
  // the user had picked it from the search results.
  readonly resolvedCurrentArea = input<LocationArea | null>(null);

  readonly queryChanged = output<string>();
  readonly suggestionSelected = output<LocationSuggestion>();
  readonly useCurrentLocationRequested = output<void>();
  readonly confirmed = output<LocationPickerConfirmedEvent>();

  // linkedSignal because searchLocation can arrive/change after
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

  // pendingArea also drives the map (see showMap/showRadius above) in
  // every mode, not only when showConfirmButton is set — pendingRadiusKm and
  // pendingSource stay confirm-button-only, so leaving them populated
  // otherwise (via the effects below) is harmless, nothing else reads them.
  //
  // A linkedSignal (not a plain computed) because it must also stay
  // directly settable: onResultSelected/onConfirm stage a pick straight
  // into it. That local override sticks until searchLocation/
  // resolvedCurrentArea themselves actually change — e.g. opening "Change
  // location" again previews the already-set point instead of starting
  // blank, and a freshly resolved current location always overrides
  // whatever was staged before.
  readonly pendingArea = linkedSignal<LocationArea | null>(() => {
    const resolved = this.resolvedCurrentArea();
    if (resolved) return resolved;
    const current = this.searchLocation();
    // Only seed the map from a value that actually has coordinates to plot —
    // a lighter SearchLocationLike (e.g. settings-account-profile's
    // coordinate-less profileCity) leaves pendingArea null instead of
    // feeding um-map an undefined lat/lng.
    return current && hasCoordinates(current) ? current : null;
  });
  readonly pendingRadiusKm = signal<number | null>(null);
  private readonly pendingSource = signal<LocationSource>('saved');

  protected readonly radiusValue = computed(() => {
    const km = this.pendingRadiusKm();
    return km != null ? String(km) : null;
  });
  protected readonly canConfirm = computed(() => this.pendingArea() !== null);

  private debounceTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // Re-seed the pending radius/source from whatever's currently committed
    // — pendingArea itself is a linkedSignal derived the same way, see above.
    effect(() => {
      const current = this.searchLocation();
      this.pendingRadiusKm.set(current?.radiusKm ?? null);
      this.pendingSource.set('saved');
    });

    // A freshly resolved current location always wins — pendingArea picks
    // it up via the linkedSignal above; this just syncs the state that
    // isn't derived there: the source, and the search box text, which
    // otherwise would keep showing whatever (if anything) the user had
    // typed, instead of the place they just resolved.
    effect(() => {
      const resolved = this.resolvedCurrentArea();
      if (resolved) {
        this.pendingSource.set('browser-geolocation');
        this.query.set(resolved.displayName);
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

    if (this.showConfirmButton()) {
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
