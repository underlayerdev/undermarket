import { TestBed } from '@angular/core/testing';
import { ListingDetailMapComponent } from './listing-detail-map';
import { LocationService } from '../../../../application/services/location.service';
import { getTranslocoTestingModule } from '../../../../../testing/transloco-testing';
import type { ListingLocation } from '../../../../domain/location/location.model';

function location(overrides: Partial<ListingLocation> = {}): ListingLocation {
  return {
    latitude: -34.6,
    longitude: -58.4,
    displayName: 'Palermo, Buenos Aires',
    countryCode: 'AR',
    region: 'Buenos Aires',
    city: 'Buenos Aires',
    neighborhood: 'Palermo',
    geohash: '6gkzwgjz',
    ...overrides,
  };
}

describe('ListingDetailMapComponent', () => {
  let staticMapUrlSpy: ReturnType<typeof vi.fn>;
  let openSpy: ReturnType<typeof vi.spyOn>;

  function setup(loc: ListingLocation, label: string) {
    staticMapUrlSpy = vi.fn().mockReturnValue('https://api.mapbox.com/static/preview.png');

    TestBed.configureTestingModule({
      imports: [ListingDetailMapComponent, getTranslocoTestingModule()],
      providers: [{ provide: LocationService, useValue: { staticMapUrl: staticMapUrlSpy } }],
    });

    const fixture = TestBed.createComponent(ListingDetailMapComponent);
    fixture.componentRef.setInput('location', loc);
    fixture.componentRef.setInput('label', label);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  it('should create', () => {
    const fixture = setup(location(), 'Palermo, Buenos Aires');
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render a static map image centered on the listing location', () => {
    const loc = location();
    const fixture = setup(loc, 'Palermo, Buenos Aires');

    expect(staticMapUrlSpy).toHaveBeenCalledWith(loc);
    const img = fixture.nativeElement.querySelector('img');
    expect(img.getAttribute('src')).toBe('https://api.mapbox.com/static/preview.png');
  });

  it('should use the given label as the image alt text and caption', () => {
    const fixture = setup(location(), 'Palermo, Buenos Aires');

    const img = fixture.nativeElement.querySelector('img');
    expect(img.getAttribute('alt')).toBe('Palermo, Buenos Aires');
    expect(fixture.nativeElement.textContent).toContain('Palermo, Buenos Aires');
  });

  it('should open Google Maps directions to the listing location on click', () => {
    const loc = location({ latitude: -34.58, longitude: -58.43 });
    const fixture = setup(loc, 'Palermo, Buenos Aires');

    fixture.nativeElement.querySelector('button').click();

    expect(openSpy).toHaveBeenCalledWith(
      'https://www.google.com/maps/dir/?api=1&destination=-34.58,-58.43',
      '_blank',
      'noopener',
    );
  });
});
