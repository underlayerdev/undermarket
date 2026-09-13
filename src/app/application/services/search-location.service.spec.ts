import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SearchLocationService } from './search-location.service';
import { AuthService } from './auth.service';
import { LocationService } from './location.service';
import { SEARCH_LOCATION_REPOSITORY } from '../../core/configuration/tokens';
import { installFakeLocalStorage } from '../../../testing/fake-local-storage';
import type { SearchLocation } from '../../domain/location/location.model';
import type { User } from '../../domain/user/user.model';

function searchLocation(overrides: Partial<SearchLocation> = {}): SearchLocation {
  return {
    displayName: 'Palermo, Buenos Aires',
    countryCode: 'AR',
    region: 'Buenos Aires',
    city: 'Buenos Aires',
    neighborhood: 'Palermo',
    latitude: -34.5875,
    longitude: -58.4205,
    geohash: '6ex2ug0d0',
    radiusKm: 10,
    source: 'saved',
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('SearchLocationService', () => {
  let currentUser: ReturnType<typeof signal<User | null>>;
  let getByUserSpy: ReturnType<typeof vi.fn>;
  let saveSpy: ReturnType<typeof vi.fn>;
  let resolveCurrentAreaSpy: ReturnType<typeof vi.fn>;
  let restoreLocalStorage: () => void;

  function setup(storedLocation: SearchLocation | null = null): SearchLocationService {
    currentUser = signal<User | null>(null);
    getByUserSpy = vi.fn().mockResolvedValue(storedLocation);
    saveSpy = vi.fn().mockResolvedValue(undefined);
    resolveCurrentAreaSpy = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { currentUser } },
        {
          provide: SEARCH_LOCATION_REPOSITORY,
          useValue: { getByUser: getByUserSpy, save: saveSpy },
        },
        { provide: LocationService, useValue: { resolveCurrentArea: resolveCurrentAreaSpy } },
      ],
    });
    return TestBed.inject(SearchLocationService);
  }

  beforeEach(() => {
    restoreLocalStorage = installFakeLocalStorage();
  });

  afterEach(() => {
    restoreLocalStorage();
  });

  it('should create', () => {
    expect(setup()).toBeTruthy();
  });

  it('should default to null with no cached or signed-in location', () => {
    const service = setup();
    expect(service.searchLocation()).toBeNull();
    expect(service.radiusKm()).toBe(10);
  });

  it('should seed from the cached localStorage value before any session resolves', () => {
    localStorage.setItem('um-search-location', JSON.stringify(searchLocation()));

    const service = setup();

    expect(service.searchLocation()?.displayName).toBe('Palermo, Buenos Aires');
  });

  it('should sync the stored location once a session is restored', async () => {
    const stored = searchLocation({ city: 'Rosario' });
    const service = setup(stored);

    currentUser.set({ id: 'user-1' } as User);
    TestBed.tick();
    await service.whenSynced();

    expect(getByUserSpy).toHaveBeenCalledWith('user-1');
    expect(service.searchLocation()).toEqual(stored);
  });

  it('should push a local location up when the account has none stored yet', async () => {
    localStorage.setItem('um-search-location', JSON.stringify(searchLocation()));
    const service = setup(null);

    currentUser.set({ id: 'user-1' } as User);
    TestBed.tick();
    await service.whenSynced();

    expect(saveSpy).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ city: 'Buenos Aires' }),
    );
  });

  it('should persist setSearchLocation to localStorage and the repository when signed in', async () => {
    const service = setup();
    currentUser.set({ id: 'user-1' } as User);
    TestBed.tick();
    await service.whenSynced();

    await service.setSearchLocation(
      {
        displayName: 'Recoleta, Buenos Aires',
        countryCode: 'AR',
        region: 'Buenos Aires',
        city: 'Buenos Aires',
        neighborhood: 'Recoleta',
        latitude: -34.5875,
        longitude: -58.3974,
        geohash: '6ex2uxyz',
      },
      'saved',
    );

    expect(service.searchLocation()?.neighborhood).toBe('Recoleta');
    expect(saveSpy).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ neighborhood: 'Recoleta' }),
    );
    expect(JSON.parse(localStorage.getItem('um-search-location')!).neighborhood).toBe('Recoleta');
  });

  it('should not persist to the repository when signed out', async () => {
    const service = setup();

    await service.setSearchLocation(searchLocation(), 'saved');

    expect(saveSpy).not.toHaveBeenCalled();
    expect(service.searchLocation()).not.toBeNull();
  });

  it('should update only the radius, keeping the current area', async () => {
    const service = setup();
    await service.setSearchLocation(searchLocation(), 'saved');

    await service.setRadius(25);

    expect(service.radiusKm()).toBe(25);
    expect(service.searchLocation()?.city).toBe('Buenos Aires');
  });

  it('should do nothing when setting the radius with no location set yet', async () => {
    const service = setup();

    await service.setRadius(25);

    expect(service.searchLocation()).toBeNull();
  });

  it('should set the search location from the resolved current area on useCurrentLocation', async () => {
    const service = setup();
    resolveCurrentAreaSpy.mockResolvedValue({
      displayName: 'Belgrano, Buenos Aires',
      countryCode: 'AR',
      region: 'Buenos Aires',
      city: 'Buenos Aires',
      neighborhood: 'Belgrano',
      latitude: -34.5627,
      longitude: -58.4583,
      geohash: '6ex2uabc',
    });

    await service.useCurrentLocation();

    expect(service.searchLocation()?.neighborhood).toBe('Belgrano');
    expect(service.searchLocation()?.source).toBe('browser-geolocation');
  });

  it('should propagate the error from useCurrentLocation without changing the current location', async () => {
    const service = setup();
    await service.setSearchLocation(searchLocation(), 'saved');
    resolveCurrentAreaSpy.mockRejectedValue(new Error('denied'));

    await expect(service.useCurrentLocation()).rejects.toThrow('denied');
    expect(service.searchLocation()?.city).toBe('Buenos Aires');
  });
});
