import { Component, computed, inject, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { ButtonComponent, IconComponent } from '@underlayerdev/ui';
import { LocationService } from '../../../../application/services/location.service';
import type { ListingLocation } from '../../../../domain/location/location.model';

// A static preview image, not an interactive map — reuses the same
// GeocodingProvider.staticMapUrl() the onboarding location step already
// relies on to visually confirm a point, so this never resolves anything
// more precise than the approximate area ListingLocation itself carries.
@Component({
  selector: 'um-listing-detail-map',
  templateUrl: './listing-detail-map.html',
  styleUrl: './listing-detail-map.scss',
  imports: [TranslocoDirective, ButtonComponent, IconComponent],
})
export class ListingDetailMapComponent {
  readonly location = input.required<ListingLocation>();
  readonly label = input.required<string>();

  private readonly locationService = inject(LocationService);

  readonly mapUrl = computed(() => this.locationService.staticMapUrl(this.location()));

  // Google's "Get Directions" universal URL — no API key required, and it
  // resolves to the native Google Maps app on mobile or maps.google.com on
  // desktop, whichever the device has. Approximate coordinates only, same as
  // the static map preview above (privacy requirement on ListingLocation).
  private readonly directionsUrl = computed(() => {
    const { latitude, longitude } = this.location();
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  });

  // ul-button always renders a native <button>, not an <a> — the design
  // system exposes no anchor-styled button variant — so this is a real
  // navigation via window.open() rather than an [href], same tradeoff every
  // other external-navigation CTA on this page would face.
  openDirections(): void {
    window.open(this.directionsUrl(), '_blank', 'noopener');
  }
}
