import { inject, Injectable } from '@angular/core';
import { GEOCODING_PROVIDER, GEOLOCATION_PROVIDER } from '../../core/configuration/tokens';
import { toLocationArea } from '../../domain/location/geohash.util';
import type {
  GeoPoint,
  LocationArea,
  LocationSuggestion,
} from '../../domain/location/location.model';

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly geocoding = inject(GEOCODING_PROVIDER);
  private readonly geolocation = inject(GEOLOCATION_PROVIDER);

  searchAreas(query: string): Promise<LocationSuggestion[]> {
    return this.geocoding.search(query);
  }

  /**
   * Resolves the device's current position and immediately reverse-geocodes
   * it — the raw GeoPoint from getCurrentPosition() never leaves this method
   * (privacy requirement: only the resolved area's centroid is ever stored
   * or shown).
   */
  async resolveCurrentArea(): Promise<LocationArea> {
    const point = await this.geolocation.getCurrentPosition();
    const suggestion = await this.geocoding.reverseGeocode(point);
    if (!suggestion) throw new Error('locationService.unresolvedArea');
    return toLocationArea(suggestion);
  }

  staticMapUrl(point: GeoPoint, opts?: { width?: number; height?: number; zoom?: number }): string {
    return this.geocoding.staticMapUrl(point, opts);
  }
}
