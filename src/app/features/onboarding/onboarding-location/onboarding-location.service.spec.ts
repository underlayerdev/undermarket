import { TestBed } from '@angular/core/testing';
import { OnboardingLocationService } from './onboarding-location.service';
import { AuthService } from '../../../application/services/auth.service';
import {
  GEOCODING_PROVIDER,
  GEOLOCATION_PROVIDER,
  SEARCH_LOCATION_REPOSITORY,
} from '../../../core/configuration/tokens';
import { GeolocationError } from '../../../domain/location/geolocation.provider';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';
import { installFakeLocalStorage } from '../../../../testing/fake-local-storage';

describe('OnboardingLocationService', () => {
  let restoreLocalStorage: () => void;
  let getCurrentPositionSpy: ReturnType<typeof vi.fn>;
  let reverseGeocodeSpy: ReturnType<typeof vi.fn>;
  let searchSpy: ReturnType<typeof vi.fn>;
  let saveSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    restoreLocalStorage = installFakeLocalStorage();
  });

  afterEach(() => {
    restoreLocalStorage();
  });

  function setup() {
    getCurrentPositionSpy = vi.fn();
    reverseGeocodeSpy = vi.fn();
    searchSpy = vi.fn();
    saveSpy = vi.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule()],
      providers: [
        { provide: AuthService, useValue: { currentUser: () => null } },
        {
          provide: GEOCODING_PROVIDER,
          useValue: {
            search: searchSpy,
            reverseGeocode: reverseGeocodeSpy,
            staticMapUrl: (point: { latitude: number; longitude: number }) =>
              `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s(${point.longitude},${point.latitude})`,
          },
        },
        { provide: GEOLOCATION_PROVIDER, useValue: { getCurrentPosition: getCurrentPositionSpy } },
        {
          provide: SEARCH_LOCATION_REPOSITORY,
          useValue: { getByUser: vi.fn().mockResolvedValue(null), save: saveSpy },
        },
      ],
    });

    return TestBed.inject(OnboardingLocationService);
  }

  it('should search areas and expose the results', async () => {
    const service = setup();
    searchSpy.mockResolvedValue([
      {
        id: 'place.1',
        displayName: 'Recoleta, Buenos Aires',
        countryCode: 'AR',
        region: 'Buenos Aires',
        city: 'Buenos Aires',
        latitude: -34.59,
        longitude: -58.39,
      },
    ]);

    await service.onLocationQueryChanged('rec');

    expect(service.locationSuggestions().length).toBe(1);
  });

  it('should clear suggestions for a blank query without calling search', async () => {
    const service = setup();

    await service.onLocationQueryChanged('   ');

    expect(searchSpy).not.toHaveBeenCalled();
    expect(service.locationSuggestions()).toEqual([]);
  });

  it('should resolve and store the current location', async () => {
    const service = setup();
    getCurrentPositionSpy.mockResolvedValue({ latitude: -34.6, longitude: -58.4 });
    reverseGeocodeSpy.mockResolvedValue({
      id: 'place.1',
      displayName: 'Palermo, Buenos Aires',
      countryCode: 'AR',
      region: 'Buenos Aires',
      city: 'Buenos Aires',
      latitude: -34.6,
      longitude: -58.4,
    });

    await service.onUseCurrentLocation();

    expect(service.resolvedLocationArea()?.city).toBe('Buenos Aires');
    expect(service.locationError()).toBeNull();
    expect(service.isResolvingLocation()).toBe(false);
  });

  it('should surface a location-specific error when resolving fails', async () => {
    const service = setup();
    getCurrentPositionSpy.mockRejectedValue(new GeolocationError('permission-denied'));

    await service.onUseCurrentLocation();

    expect(service.locationError()).toBeTruthy();
    expect(service.resolvedLocationArea()).toBeNull();
  });

  it('should set the resolved area when a suggestion is picked', async () => {
    const service = setup();

    await service.onLocationPicked({
      id: 'place.1',
      displayName: 'Recoleta, Buenos Aires',
      countryCode: 'AR',
      region: 'Buenos Aires',
      city: 'Buenos Aires',
      neighborhood: 'Recoleta',
      latitude: -34.59,
      longitude: -58.39,
    });

    expect(service.resolvedLocationArea()?.neighborhood).toBe('Recoleta');
  });

  describe('mapPreview', () => {
    it('should be null before any location is resolved', () => {
      const service = setup();

      expect(service.mapPreview()).toBeNull();
    });

    it('should digest the resolved area into an <img>-ready url and label', async () => {
      const service = setup();

      await service.onLocationPicked({
        id: 'place.1',
        displayName: 'Recoleta, Buenos Aires',
        countryCode: 'AR',
        region: 'Buenos Aires',
        city: 'Buenos Aires',
        latitude: -34.59,
        longitude: -58.39,
      });

      const preview = service.mapPreview();
      expect(preview?.label).toBe('Recoleta, Buenos Aires');
      expect(preview?.url).toContain('api.mapbox.com');
      expect(preview?.url).toContain('-58.39,-34.59');
    });
  });
});
