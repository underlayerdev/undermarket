import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { SEARCH_LOCATION_REPOSITORY } from '../../core/configuration/tokens';
import { DEFAULT_SEARCH_RADIUS_KM } from '../../domain/location/geohash.util';
import type {
  LocationArea,
  LocationSource,
  SearchLocation,
} from '../../domain/location/location.model';
import { AuthService } from './auth.service';
import { LocationService } from './location.service';
import { readCachedSearchLocation, writeCachedSearchLocation } from './search-location-cache.util';

/**
 * Owns the "where am I browsing right now" location — distinct from any
 * profile field, and never stored on the public users/{userId} doc (see
 * userSearchLocations/{userId} in firestore.rules).
 *
 * Mirrors LanguageService: seed a signal synchronously from localStorage
 * before auth resolves (no flash of "no location" on every reload), then
 * lazily sync from/to the signed-in user's private Firestore doc.
 */
@Injectable({ providedIn: 'root' })
export class SearchLocationService {
  private readonly repo = inject(SEARCH_LOCATION_REPOSITORY);
  private readonly authService = inject(AuthService);
  private readonly locationService = inject(LocationService);

  readonly searchLocation = signal<SearchLocation | null>(readCachedSearchLocation());
  readonly radiusKm = computed(() => this.searchLocation()?.radiusKm ?? DEFAULT_SEARCH_RADIUS_KM);

  /** The id whose search location is already synced, so we don't re-sync on every profile write. */
  private syncedUserId: string | null = null;

  /** The in-flight profile sync, so a write can wait for it to settle first. */
  private syncInFlight: Promise<void> | null = null;

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (!user) {
        this.syncedUserId = null;
        return;
      }
      if (user.id === this.syncedUserId) return;
      this.syncedUserId = user.id;
      this.syncInFlight = this.syncFromProfile(user.id);
    });
  }

  /** Resolves once the sync triggered by the current session has settled — nothing in the UI needs to await this, it exists for ordering in tests/callers. */
  async whenSynced(): Promise<void> {
    await this.syncInFlight?.catch(() => undefined);
  }

  async setSearchLocation(area: LocationArea, source: LocationSource): Promise<void> {
    await this.apply({ ...area, radiusKm: this.radiusKm(), source, updatedAt: new Date() });
  }

  async setRadius(radiusKm: number): Promise<void> {
    const current = this.searchLocation();
    if (!current) return;
    await this.apply({ ...current, radiusKm, updatedAt: new Date() });
  }

  async useCurrentLocation(): Promise<void> {
    const area = await this.locationService.resolveCurrentArea();
    await this.setSearchLocation(area, 'browser-geolocation');
  }

  private async apply(location: SearchLocation): Promise<void> {
    this.searchLocation.set(location);
    writeCachedSearchLocation(location);

    const user = this.authService.currentUser();
    if (!user) return;

    // Wait for any in-flight sync before writing, so an initial read can't
    // land after (and overwrite) the choice the user just made.
    await this.syncInFlight?.catch(() => undefined);
    await this.repo.save(user.id, location);
  }

  private async syncFromProfile(userId: string): Promise<void> {
    const localAtStart = this.searchLocation();
    const stored = await this.repo.getByUser(userId);

    // The local value may have changed (or a save may have started) while
    // the fetch was in flight — the user's most recent action wins.
    if (this.searchLocation() !== localAtStart) return;
    if (this.syncedUserId !== userId) return;

    if (stored) {
      this.searchLocation.set(stored);
      writeCachedSearchLocation(stored);
    } else if (localAtStart) {
      // An account with a local (e.g. anonymous-session) location but no
      // stored doc yet — persist it now instead of losing it on next reload.
      await this.repo.save(userId, localAtStart);
    }
  }
}
