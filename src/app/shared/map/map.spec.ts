import { TestBed } from '@angular/core/testing';
import { MapComponent } from './map';
import { LocationService } from '../../application/services/location.service';
import type { GeoPoint } from '../../domain/location/location.model';

const PALERMO: GeoPoint = { latitude: -34.5875, longitude: -58.4205 };

describe('MapComponent', () => {
  let staticMapUrlSpy: ReturnType<typeof vi.fn>;

  function setup() {
    staticMapUrlSpy = vi.fn().mockReturnValue('https://api.mapbox.com/preview.png');
    TestBed.configureTestingModule({
      imports: [MapComponent],
      providers: [{ provide: LocationService, useValue: { staticMapUrl: staticMapUrlSpy } }],
    });
    const fixture = TestBed.createComponent(MapComponent);
    fixture.componentRef.setInput('locationGeoPoints', PALERMO);
    fixture.componentRef.setInput('alt', 'Palermo, Buenos Aires');
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the static map image with the given alt text', () => {
    const fixture = setup();

    const img: HTMLImageElement = fixture.nativeElement.querySelector('img');
    expect(img.src).toBe('https://api.mapbox.com/preview.png');
    expect(img.alt).toBe('Palermo, Buenos Aires');
  });

  it('should request a fixed width/height/zoom so the radius math below always matches the image', () => {
    const fixture = setup();

    expect(staticMapUrlSpy).toHaveBeenCalledWith(PALERMO, { width: 320, height: 160, zoom: 13 });
  });

  it('should render no radius overlay when radiusKm is absent', () => {
    const fixture = setup();

    expect(fixture.nativeElement.querySelector('.um-map__radius')).toBeNull();
  });

  it('should render a radius overlay close to the target on-screen size, well within the image frame', () => {
    const fixture = setup();
    fixture.componentRef.setInput('radiusKm', 10);
    fixture.detectChanges();

    const overlay: HTMLElement = fixture.nativeElement.querySelector('.um-map__radius');
    expect(overlay).toBeTruthy();
    expect(overlay.style.width).toBe(overlay.style.height);
    // Target is 60% of the 160px-tall frame (96px) — never the whole frame,
    // which is exactly the "map goes all purple" bug this guards against.
    expect(parseFloat(overlay.style.width)).toBeCloseTo(96, 0);
  });

  it('should keep the overlay the same on-screen size regardless of radius, by zooming out instead', () => {
    const fixture = setup();
    staticMapUrlSpy.mockClear();

    fixture.componentRef.setInput('radiusKm', 5);
    fixture.detectChanges();
    const smallRadiusDiameter = fixture.componentInstance.radiusDiameterPx();

    fixture.componentRef.setInput('radiusKm', 100);
    fixture.detectChanges();
    const largeRadiusDiameter = fixture.componentInstance.radiusDiameterPx();

    // Same target size either way...
    expect(largeRadiusDiameter).toBeCloseTo(smallRadiusDiameter!, 0);
    // ...achieved by requesting a lower (more zoomed-out) zoom for the
    // bigger radius, not a bigger circle.
    const [, smallRadiusOpts] = staticMapUrlSpy.mock.calls[0];
    const [, largeRadiusOpts] = staticMapUrlSpy.mock.calls[1];
    expect(largeRadiusOpts.zoom).toBeLessThan(smallRadiusOpts.zoom);
  });

  it('should clamp zoom for an extreme radius rather than requesting an invalid level', () => {
    const fixture = setup();

    fixture.componentRef.setInput('radiusKm', 100000);
    fixture.detectChanges();

    const [, { zoom }] = staticMapUrlSpy.mock.calls.at(-1)!;
    expect(zoom).toBeGreaterThanOrEqual(2);
  });

  it('should open Google Maps directions when the image is clicked', () => {
    const fixture = setup();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    const img: HTMLImageElement = fixture.nativeElement.querySelector('img');
    img.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(openSpy).toHaveBeenCalledWith(
      `https://www.google.com/maps/dir/?api=1&destination=${PALERMO.latitude},${PALERMO.longitude}`,
      '_blank',
      'noopener',
    );
    openSpy.mockRestore();
  });
});
