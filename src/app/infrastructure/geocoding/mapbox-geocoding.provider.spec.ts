import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MapboxGeocodingProvider } from './mapbox-geocoding.provider';

function feature(overrides: Record<string, unknown> = {}) {
  return {
    id: 'place.123',
    place_name: 'Palermo, Buenos Aires, Argentina',
    place_type: ['neighborhood'],
    center: [-58.4205, -34.5875],
    text: 'Palermo',
    context: [
      { id: 'neighborhood.1', text: 'Palermo' },
      { id: 'place.1', text: 'Buenos Aires' },
      { id: 'region.1', text: 'Buenos Aires' },
      { id: 'country.1', text: 'Argentina', short_code: 'ar' },
    ],
    ...overrides,
  };
}

describe('MapboxGeocodingProvider', () => {
  let getSpy: ReturnType<typeof vi.fn>;

  function setup(): MapboxGeocodingProvider {
    getSpy = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: HttpClient, useValue: { get: getSpy } }],
    });
    return TestBed.inject(MapboxGeocodingProvider);
  }

  it('should search with place-level types and map the response into suggestions', async () => {
    const provider = setup();
    getSpy.mockReturnValue(of({ features: [feature()] }));

    const results = await provider.search('Palermo');

    expect(getSpy).toHaveBeenCalledWith(
      expect.stringContaining('/geocoding/v5/mapbox.places/Palermo.json'),
      expect.objectContaining({
        params: expect.objectContaining({ types: 'place,locality,neighborhood,region' }),
      }),
    );
    expect(results).toEqual([
      {
        id: 'place.123',
        displayName: 'Palermo, Buenos Aires, Argentina',
        countryCode: 'AR',
        region: 'Buenos Aires',
        city: 'Buenos Aires',
        neighborhood: 'Palermo',
        latitude: -34.5875,
        longitude: -58.4205,
      },
    ]);
  });

  it('should filter out results that are not place-level even if returned', async () => {
    const provider = setup();
    getSpy.mockReturnValue(of({ features: [feature({ place_type: ['address'] })] }));

    const results = await provider.search('123 Main St');

    expect(results).toEqual([]);
  });

  it('should reverse-geocode with address/poi excluded from the requested types', async () => {
    const provider = setup();
    getSpy.mockReturnValue(of({ features: [feature()] }));

    const result = await provider.reverseGeocode({ latitude: -34.5875, longitude: -58.4205 });

    expect(getSpy).toHaveBeenCalledWith(
      expect.stringContaining('/geocoding/v5/mapbox.places/-58.4205%2C-34.5875.json'),
      expect.objectContaining({
        params: expect.objectContaining({ types: 'place,locality,neighborhood' }),
      }),
    );
    expect(result?.displayName).toBe('Palermo, Buenos Aires, Argentina');
  });

  it('should never surface an address/poi-level result from reverseGeocode even if one is returned', async () => {
    const provider = setup();
    getSpy.mockReturnValue(
      of({
        features: [feature({ id: 'address.1', place_type: ['address'] }), feature()],
      }),
    );

    const result = await provider.reverseGeocode({ latitude: -34.5875, longitude: -58.4205 });

    expect(result?.id).toBe('place.123');
  });

  it('should return null from reverseGeocode when nothing resolvable is found', async () => {
    const provider = setup();
    getSpy.mockReturnValue(of({ features: [feature({ place_type: ['address'] })] }));

    const result = await provider.reverseGeocode({ latitude: -34.5875, longitude: -58.4205 });

    expect(result).toBeNull();
  });
});
