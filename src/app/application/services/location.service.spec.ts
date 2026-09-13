import { TestBed } from '@angular/core/testing';
import { LocationService } from './location.service';
import { GEOCODING_PROVIDER, GEOLOCATION_PROVIDER } from '../../core/configuration/tokens';

describe('LocationService', () => {
  let searchSpy: ReturnType<typeof vi.fn>;
  let reverseGeocodeSpy: ReturnType<typeof vi.fn>;
  let getCurrentPositionSpy: ReturnType<typeof vi.fn>;

  function setup(): LocationService {
    searchSpy = vi.fn();
    reverseGeocodeSpy = vi.fn();
    getCurrentPositionSpy = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: GEOCODING_PROVIDER,
          useValue: { search: searchSpy, reverseGeocode: reverseGeocodeSpy },
        },
        { provide: GEOLOCATION_PROVIDER, useValue: { getCurrentPosition: getCurrentPositionSpy } },
      ],
    });
    return TestBed.inject(LocationService);
  }

  it('should delegate searchAreas to the geocoding provider', async () => {
    const service = setup();
    searchSpy.mockResolvedValue([{ id: 'place.1', displayName: 'Palermo' }]);

    const results = await service.searchAreas('Palermo');

    expect(searchSpy).toHaveBeenCalledWith('Palermo');
    expect(results).toEqual([{ id: 'place.1', displayName: 'Palermo' }]);
  });

  it('should resolve the current area from the geocoded suggestion, never the raw geolocation point', async () => {
    const service = setup();
    const rawPoint = { latitude: -1, longitude: -1 };
    const geocodedPoint = { latitude: -34.5875, longitude: -58.4205 };
    getCurrentPositionSpy.mockResolvedValue(rawPoint);
    reverseGeocodeSpy.mockResolvedValue({
      id: 'place.1',
      displayName: 'Palermo, Buenos Aires',
      countryCode: 'AR',
      region: 'Buenos Aires',
      city: 'Buenos Aires',
      ...geocodedPoint,
    });

    const area = await service.resolveCurrentArea();

    expect(reverseGeocodeSpy).toHaveBeenCalledWith(rawPoint);
    expect(area.latitude).toBe(geocodedPoint.latitude);
    expect(area.longitude).toBe(geocodedPoint.longitude);
    expect(area.geohash).toBeTruthy();
  });

  it('should throw when reverse geocoding cannot resolve an area', async () => {
    const service = setup();
    getCurrentPositionSpy.mockResolvedValue({ latitude: -1, longitude: -1 });
    reverseGeocodeSpy.mockResolvedValue(null);

    await expect(service.resolveCurrentArea()).rejects.toThrow();
  });
});
