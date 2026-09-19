import { computed, inject, Service, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { ErrorService } from '../../../application/services/error.service';
import { LocationService } from '../../../application/services/location.service';
import { SearchLocationService } from '../../../application/services/search-location.service';
import { toLocationErrorMessage } from '../../../application/services/location-error.util';
import { toLocationArea } from '../../../domain/location/geohash.util';
import { LocationSuggestion, LocationArea } from '../../../domain/location/location.model';
import type { LocationMapPreview } from './onboarding-location.model';

@Service()
export class OnboardingLocationService {
  private readonly errorService = inject(ErrorService);
  private readonly transloco = inject(TranslocoService);
  private readonly locationService = inject(LocationService);
  protected readonly searchLocationService = inject(SearchLocationService);

  readonly locationSuggestions = signal<LocationSuggestion[]>([]);
  readonly isResolvingLocation = signal(false);
  readonly locationError = signal<string | null>(null);
  readonly resolvedLocationArea = signal<LocationArea | null>(null);

  // The digested, <img>-ready shape — computed once here rather than
  // calling locationService.staticMapUrl() straight from the template.
  readonly mapPreview = computed<LocationMapPreview | null>(() => {
    const area = this.resolvedLocationArea();
    if (!area) return null;
    return { url: this.locationService.staticMapUrl(area), label: area.displayName };
  });

  async onLocationQueryChanged(query: string): Promise<void> {
    if (!query.trim()) {
      this.locationSuggestions.set([]);
      return;
    }
    try {
      const areas = await this.locationService.searchAreas(query);
      this.locationSuggestions.set(areas);
    } catch {
      this.locationSuggestions.set([]);
    }
  }

  async onLocationPicked(suggestion: LocationSuggestion): Promise<void> {
    this.locationError.set(null);
    try {
      await this.searchLocationService.setSearchLocation(toLocationArea(suggestion), 'saved');
    } catch (err) {
      this.locationError.set(this.errorService.toUserMessage(err));
    } finally {
      // setSearchLocation updates its own signal before attempting the
      // remote save, so this still reflects the pick even if that save
      // (but not the pick itself) failed.
      this.resolvedLocationArea.set(this.searchLocationService.searchLocation());
    }
  }

  async onUseCurrentLocation(): Promise<void> {
    this.isResolvingLocation.set(true);
    this.locationError.set(null);
    try {
      const area = await this.locationService.resolveCurrentArea();
      await this.searchLocationService.setSearchLocation(area, 'browser-geolocation');
    } catch (err) {
      this.locationError.set(toLocationErrorMessage(err, this.transloco));
    } finally {
      this.resolvedLocationArea.set(this.searchLocationService.searchLocation());
      this.isResolvingLocation.set(false);
    }
  }
}
