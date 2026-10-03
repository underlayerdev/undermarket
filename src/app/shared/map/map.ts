import { Component, computed, inject, input } from '@angular/core';
import { GeoPoint } from '../../domain/location/location.model';
import { LocationService } from '../../application/services/location.service';

const MAP_WIDTH = 320;
const MAP_HEIGHT = 160;
// Used only when there's no radius to show (a plain single-point preview) —
// close enough to confirm the exact spot without the context a radius view
// needs. See computeZoomForRadius() below for the radius case.
const POINT_ZOOM = 13;

// Target diameter (CSS px) for the radius circle, as a fraction of the
// image's shorter side — small enough to always leave visible map context
// around the circle (roads, the pin), matching the Wallapop-style preview
// this is modeled on, rather than the circle filling (or overflowing) the
// whole frame.
const RADIUS_CIRCLE_TARGET_FRACTION = 0.6;
const RADIUS_CIRCLE_TARGET_DIAMETER_PX =
  Math.min(MAP_WIDTH, MAP_HEIGHT) * RADIUS_CIRCLE_TARGET_FRACTION;

// Mapbox static images support fractional zoom down to 0; clamping keeps
// an extreme radius (very small or very large) from asking for a zoom
// level the tile service doesn't actually have imagery for.
const MIN_ZOOM = 2;
const MAX_ZOOM = 16;

// Web Mercator ground resolution (meters/pixel) at the equator for zoom 0,
// halved per zoom level — https://wiki.openstreetmap.org/wiki/Zoom_levels.
// Mapbox's `@2x` modifier (baked into staticMapUrl) only doubles pixel
// density for retina sharpness; it doesn't change the geographic span an
// image covers at a given zoom, which is what this constant is for.
const EQUATOR_METERS_PER_PIXEL_AT_ZOOM_0 = 156543.03392;

function metersPerPixelAtZoom(latitude: number, zoom: number): number {
  const latitudeRadians = (latitude * Math.PI) / 180;
  return (EQUATOR_METERS_PER_PIXEL_AT_ZOOM_0 * Math.cos(latitudeRadians)) / 2 ** zoom;
}

// The zoom level at which a radiusKm circle renders at exactly
// RADIUS_CIRCLE_TARGET_DIAMETER_PX — i.e. the map zooms out as the radius
// grows, the same way Wallapop's radius preview does, instead of a fixed
// zoom that would make a 100km circle either overflow the frame entirely
// (too zoomed in) or a 5km one shrink to a speck (too zoomed out).
function computeZoomForRadius(radiusKm: number, latitude: number): number {
  const metersPerPixel = (radiusKm * 1000 * 2) / RADIUS_CIRCLE_TARGET_DIAMETER_PX;
  const latitudeRadians = (latitude * Math.PI) / 180;
  const zoom = Math.log2(
    (EQUATOR_METERS_PER_PIXEL_AT_ZOOM_0 * Math.cos(latitudeRadians)) / metersPerPixel,
  );
  // Mapbox's static API accepts fractional zoom, but there's no reason to
  // hand it (or bake into a cached image URL) more precision than this —
  // rounded to 2dp rather than left as whatever float Math.log2 produces.
  return Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) * 100) / 100;
}

@Component({
  selector: 'um-map',
  templateUrl: 'map.html',
  styleUrl: 'map.scss',
  imports: [],
})
export class MapComponent<T extends GeoPoint> {
  readonly locationGeoPoints = input.required<T>();
  readonly alt = input.required<string>();
  // Optional — draws a translucent coverage circle centered on the point,
  // approximating a Wallapop-style "search radius" preview. Omitted
  // entirely (no circle) when absent, e.g. a plain single-point preview.
  readonly radiusKm = input<number | null>(null);

  private readonly locationService = inject(LocationService);

  // Zooms out as the radius grows (see computeZoomForRadius) so the circle
  // overlay below always renders at the same on-screen size; falls back to
  // a fixed close-up zoom when there's no radius to show at all.
  private readonly zoom = computed(() => {
    const radiusKm = this.radiusKm();
    return radiusKm
      ? computeZoomForRadius(radiusKm, this.locationGeoPoints().latitude)
      : POINT_ZOOM;
  });

  readonly mapUrl = computed(() =>
    this.locationService.staticMapUrl(this.locationGeoPoints(), {
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
      zoom: this.zoom(),
    }),
  );

  // Diameter of the radius circle in CSS pixels — null (no overlay
  // rendered) when there's no radius to show. Always
  // RADIUS_CIRCLE_TARGET_DIAMETER_PX by construction once zoom() has
  // solved for it, except at the MIN_ZOOM/MAX_ZOOM clamp boundaries (an
  // extreme radius), where it's recomputed from whatever zoom was actually
  // used so the overlay still matches the fetched image.
  readonly radiusDiameterPx = computed(() => {
    const radiusKm = this.radiusKm();
    if (!radiusKm) return null;
    const metersPerPixel = metersPerPixelAtZoom(this.locationGeoPoints().latitude, this.zoom());
    return (2 * radiusKm * 1000) / metersPerPixel;
  });

  // Google's "Get Directions" universal URL — no API key required, and it
  // resolves to the native Google Maps app on mobile or maps.google.com on
  // desktop, whichever the device has. Approximate coordinates only, same as
  // the static map preview above (privacy requirement on ListingLocation).
  private readonly directionsUrl = computed(() => {
    return `https://www.google.com/maps/dir/?api=1&destination=${this.locationGeoPoints().latitude},${this.locationGeoPoints().longitude}`;
  });

  // ul-button always renders a native <button>, not an <a> — the design
  // system exposes no anchor-styled button variant — so this is a real
  // navigation via window.open() rather than an [href], same tradeoff every
  // other external-navigation CTA on this page would face.
  openDirections(): void {
    window.open(this.directionsUrl(), '_blank', 'noopener');
  }
}
