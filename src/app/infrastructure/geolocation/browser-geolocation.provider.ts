import { Injectable } from '@angular/core';
import { GeolocationError } from '../../domain/location/geolocation.provider';
import type { GeolocationProvider } from '../../domain/location/geolocation.provider';
import type { GeoPoint } from '../../domain/location/location.model';

// Standard GeolocationPositionError codes (1/2/3) — used as literals rather
// than via the global GeolocationPositionError constructor's static
// properties, which some test/runtime environments (e.g. jsdom) don't define.
function toErrorCode(code: number): 'permission-denied' | 'position-unavailable' | 'timeout' {
  switch (code) {
    case 1:
      return 'permission-denied';
    case 2:
      return 'position-unavailable';
    default:
      return 'timeout';
  }
}

@Injectable({ providedIn: 'root' })
export class BrowserGeolocationProvider implements GeolocationProvider {
  getCurrentPosition(): Promise<GeoPoint> {
    if (!('geolocation' in navigator)) {
      return Promise.reject(new GeolocationError('unsupported'));
    }

    return new Promise<GeoPoint>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        (error) => reject(new GeolocationError(toErrorCode(error.code))),
      );
    });
  }
}
