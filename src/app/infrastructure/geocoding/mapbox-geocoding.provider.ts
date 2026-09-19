import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { GeocodingProvider } from '../../domain/location/geocoding.provider';
import type { GeoPoint, LocationSuggestion } from '../../domain/location/location.model';

// Place-level types only — deliberately excludes 'address'/'poi', both here
// and for reverseGeocode below, so a raw GPS reading can never be resolved
// down to street level (privacy requirement). 'region' is dropped for
// reverse geocoding specifically: turning a coordinate into "the whole
// province" as the nearest match is a much worse fallback than it is for a
// forward text search, where the user typed the region name on purpose.
const PLACE_TYPES = 'place,locality,neighborhood,region';
const REVERSE_PLACE_TYPES = 'place,locality,neighborhood';
// Mapbox's `types` request param (above) is a hint, not a guarantee —
// out-of-type features have shown up in responses regardless — so this is
// the actual enforcement of the privacy requirement, applied again to
// whatever comes back rather than trusting the request alone.
const ALLOWED_PLACE_TYPES = new Set(['place', 'locality', 'neighborhood', 'region']);

// Partial shape of a Mapbox Geocoding v5 feature — only the fields this
// provider reads. Full schema: https://docs.mapbox.com/api/search/geocoding/
interface MapboxContextEntry {
  // e.g. "region.123" or "country.456" — the substring before the dot is a
  // stable place-type tag, which is what contextValue() below matches on
  // (context entries aren't in a fixed order, so position can't be relied on).
  id: string;
  text: string;
  // Only present on the country-level context entry; ISO 3166-1 alpha-2,
  // lowercase (e.g. "ar"). countryCode() below uppercases it to match this
  // app's own convention (LocationArea/PublicCityInfo, and the
  // `/^[A-Z]{2}$/` check in location.validator.ts).
  short_code?: string;
}

interface MapboxFeature {
  id: string;
  place_name: string;
  place_type: string[];
  center: [number, number]; // [lng, lat] — Mapbox's axis order, the reverse of this app's {latitude, longitude}.
  text: string;
  // Ancestor places only — a city feature's context lists its region/country
  // but never repeats itself. That's why toSuggestion() below falls back to
  // `feature.text` for region/city: searching "Buenos Aires" directly
  // returns a feature *of* that place, with nothing in its own context
  // pointing back at it.
  context?: MapboxContextEntry[];
}

interface MapboxResponse {
  features: MapboxFeature[];
}

function contextValue(
  context: MapboxContextEntry[] | undefined,
  prefix: string,
): string | undefined {
  return context?.find((entry) => entry.id.startsWith(`${prefix}.`))?.text;
}

@Injectable({ providedIn: 'root' })
export class MapboxGeocodingProvider implements GeocodingProvider {
  private readonly http = inject(HttpClient);

  async search(
    query: string,
    opts?: { proximity?: GeoPoint; language?: string },
  ): Promise<LocationSuggestion[]> {
    const params: Record<string, string> = {
      access_token: environment.mapbox.accessToken,
      types: PLACE_TYPES,
      ...(opts?.language ? { language: opts.language } : {}),
      // "lng,lat" — Mapbox's proximity param takes the opposite axis order
      // from this app's own GeoPoint, biasing results toward that point
      // without restricting them to it (e.g. ranking a same-named city
      // closer to the caller's current area first).
      ...(opts?.proximity
        ? { proximity: `${opts.proximity.longitude},${opts.proximity.latitude}` }
        : {}),
    };
    const response = await this.get(query, params);
    return response.features
      .filter((feature) => feature.place_type.some((type) => ALLOWED_PLACE_TYPES.has(type)))
      .map((feature) => this.toSuggestion(feature));
  }

  async reverseGeocode(point: GeoPoint): Promise<LocationSuggestion | null> {
    const params: Record<string, string> = {
      access_token: environment.mapbox.accessToken,
      types: REVERSE_PLACE_TYPES,
    };
    // Mapbox's reverse-geocoding endpoint takes the same path-segment shape
    // as a forward search, just with "lng,lat" in place of free text.
    const response = await this.get(`${point.longitude},${point.latitude}`, params);
    // Mapbox already sorts by relevance, so the first type-matching result
    // is the closest allowed one — take it rather than the raw first result,
    // in case a filtered-out type (never possible per `types` above, but see
    // the ALLOWED_PLACE_TYPES comment) sorted ahead of it.
    const feature = response.features.find((candidate) =>
      candidate.place_type.some((type) => ALLOWED_PLACE_TYPES.has(type)),
    );
    return feature ? this.toSuggestion(feature) : null;
  }

  // `pathQuery` is either the free-text search string or a "lng,lat" pair —
  // Mapbox's REST API takes both as the same URL path segment, distinguished
  // only by the `types` param each caller above already sets accordingly.
  private async get(pathQuery: string, params: Record<string, string>): Promise<MapboxResponse> {
    const url = `${environment.mapbox.api}/geocoding/v5/mapbox.places/${encodeURIComponent(pathQuery)}.json`;
    return firstValueFrom(this.http.get<MapboxResponse>(url, { params }));
  }

  private toSuggestion(feature: MapboxFeature): LocationSuggestion {
    const [longitude, latitude] = feature.center;
    return {
      id: feature.id,
      displayName: feature.place_name,
      countryCode: this.countryCode(feature),
      // 'place' is Mapbox's type name for what this app calls "city" — a
      // Mapbox 'region'-type feature (found directly, not as an ancestor)
      // has no 'place' context entry either, so it too falls back to its
      // own text, same as the region case just above it.
      region: contextValue(feature.context, 'region') ?? feature.text,
      city: contextValue(feature.context, 'place') ?? feature.text,
      // Omitted (not undefined) when the feature has no neighborhood
      // ancestor — most places above city-level don't, and LocationSuggestion
      // /LocationArea treat this field as optional, not nullable.
      ...(contextValue(feature.context, 'neighborhood')
        ? { neighborhood: contextValue(feature.context, 'neighborhood') }
        : {}),
      latitude,
      longitude,
    };
  }

  // No fallback-to-self needed here, unlike region/city in toSuggestion()
  // above: ALLOWED_PLACE_TYPES never includes 'country' itself, so every
  // feature this runs on is below country level and always has one in its
  // context.
  private countryCode(feature: MapboxFeature): string {
    const countryEntry = feature.context?.find((entry) => entry.id.startsWith('country.'));
    return (countryEntry?.short_code ?? '').toUpperCase();
  }

  // Mapbox's Static Images API — a plain image URL, not a JSON endpoint, so
  // this is synchronous string-building rather than an HTTP call. Dark style
  // and brand purple pin to match the app's theme; there's nothing to drag,
  // this is for visually confirming a resolved point, not adjusting it.
  staticMapUrl(point: GeoPoint, opts?: { width?: number; height?: number; zoom?: number }): string {
    const { width = 320, height = 160, zoom = 13 } = opts ?? {};
    const pin = `pin-s+6f3de0(${point.longitude},${point.latitude})`;
    return (
      `${environment.mapbox.api}/styles/v1/mapbox/dark-v11/static/${pin}/` +
      `${point.longitude},${point.latitude},${zoom}/${width}x${height}@2x` +
      `?access_token=${environment.mapbox.accessToken}`
    );
  }
}
