import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SearchLocationBarComponent } from './search-location-bar';
import { LocationService } from '../../../application/services/location.service';
import { SearchLocationService } from '../../../application/services/search-location.service';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';
import type { LocationArea, SearchLocation } from '../../../domain/location/location.model';

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

function area(overrides: Partial<LocationArea> = {}): LocationArea {
  return {
    displayName: 'Recoleta, Buenos Aires',
    countryCode: 'AR',
    region: 'Buenos Aires',
    city: 'Buenos Aires',
    neighborhood: 'Recoleta',
    latitude: -34.5875,
    longitude: -58.3974,
    geohash: '6ex2ug0d2',
    ...overrides,
  };
}

describe('SearchLocationBarComponent', () => {
  let fakeSearchLocation: ReturnType<typeof signal<SearchLocation | null>>;
  let setSearchLocationSpy: ReturnType<typeof vi.fn>;
  let setRadiusSpy: ReturnType<typeof vi.fn>;
  let resolveCurrentAreaSpy: ReturnType<typeof vi.fn>;
  let searchAreasSpy: ReturnType<typeof vi.fn>;

  function setup(initialLocation: SearchLocation | null = null) {
    fakeSearchLocation = signal(initialLocation);
    setSearchLocationSpy = vi.fn().mockResolvedValue(undefined);
    setRadiusSpy = vi.fn().mockResolvedValue(undefined);
    resolveCurrentAreaSpy = vi.fn().mockResolvedValue(area());
    searchAreasSpy = vi.fn().mockResolvedValue([]);

    TestBed.configureTestingModule({
      imports: [SearchLocationBarComponent, getTranslocoTestingModule()],
      providers: [
        {
          provide: SearchLocationService,
          useValue: {
            searchLocation: fakeSearchLocation,
            radiusKm: () => fakeSearchLocation()?.radiusKm ?? 10,
            setSearchLocation: setSearchLocationSpy,
            setRadius: setRadiusSpy,
          },
        },
        {
          provide: LocationService,
          useValue: {
            searchAreas: searchAreasSpy,
            resolveCurrentArea: resolveCurrentAreaSpy,
            staticMapUrl: vi.fn().mockReturnValue('https://api.mapbox.com/preview.png'),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(SearchLocationBarComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should auto-open with first-run copy when there is no search location yet', () => {
    const fixture = setup(null);

    expect(fixture.componentInstance.open()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Where should we search?');
  });

  it('should not auto-open once a search location is set', () => {
    const fixture = setup(searchLocation());

    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('should display the current search location and radius label', () => {
    const fixture = setup(searchLocation());

    expect(fixture.nativeElement.textContent).toContain('Palermo, Buenos Aires');
    expect(fixture.nativeElement.textContent).toContain('Within 10 km');
  });

  it('should set the search location and close the modal once confirmed', async () => {
    const fixture = setup();
    fixture.componentInstance.open.set(true);

    await fixture.componentInstance.onConfirmed({ area: area(), source: 'saved' });

    expect(setSearchLocationSpy).toHaveBeenCalledWith(area(), 'saved');
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('should also set the radius when the confirmed event carries one', async () => {
    const fixture = setup();

    await fixture.componentInstance.onConfirmed({ area: area(), radiusKm: 25, source: 'saved' });

    expect(setRadiusSpy).toHaveBeenCalledWith(25);
  });

  it('should not touch the radius when the confirmed event has none', async () => {
    const fixture = setup();

    await fixture.componentInstance.onConfirmed({ area: area(), source: 'saved' });

    expect(setRadiusSpy).not.toHaveBeenCalled();
  });

  it('should resolve the current location into a pending preview, without persisting it yet', async () => {
    const fixture = setup();

    await fixture.componentInstance.onUseCurrentLocationRequested();

    expect(resolveCurrentAreaSpy).toHaveBeenCalled();
    expect(fixture.componentInstance.resolvedCurrentArea()).toEqual(area());
    expect(setSearchLocationSpy).not.toHaveBeenCalled();
  });

  it('should emit a translated error message when resolving the current location fails', async () => {
    const fixture = setup();
    resolveCurrentAreaSpy.mockRejectedValue(new Error('denied'));
    const emitted: string[] = [];
    fixture.componentInstance.locationErrorOccurred.subscribe((value) => emitted.push(value));

    await fixture.componentInstance.onUseCurrentLocationRequested();

    expect(emitted).toEqual(["We couldn't resolve that location. Please try a different search."]);
  });

  it('should fetch suggestions as the query changes', async () => {
    const fixture = setup();
    searchAreasSpy.mockResolvedValue([{ id: 'place.1', displayName: 'Recoleta, Buenos Aires' }]);

    await fixture.componentInstance.onQueryChanged('Recoleta');

    expect(searchAreasSpy).toHaveBeenCalledWith('Recoleta');
  });

  it('should clear suggestions for a blank query without calling searchAreas', async () => {
    const fixture = setup();

    await fixture.componentInstance.onQueryChanged('   ');

    expect(searchAreasSpy).not.toHaveBeenCalled();
  });
});
