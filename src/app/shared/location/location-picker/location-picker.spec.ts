import { TestBed } from '@angular/core/testing';
import { LocationPickerComponent } from './location-picker';
import type { LocationPickerConfirmedEvent } from './location-picker';
import { LocationService } from '../../../application/services/location.service';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';
import type { LocationSuggestion, SearchLocation } from '../../../domain/location/location.model';

function suggestion(overrides: Partial<LocationSuggestion> = {}): LocationSuggestion {
  return {
    id: 'place.1',
    displayName: 'Palermo, Buenos Aires',
    countryCode: 'AR',
    region: 'Buenos Aires',
    city: 'Buenos Aires',
    neighborhood: 'Palermo',
    latitude: -34.5875,
    longitude: -58.4205,
    ...overrides,
  };
}

function searchLocation(overrides: Partial<SearchLocation> = {}): SearchLocation {
  return {
    displayName: 'Recoleta, Buenos Aires',
    countryCode: 'AR',
    region: 'Buenos Aires',
    city: 'Buenos Aires',
    neighborhood: 'Recoleta',
    latitude: -34.5885,
    longitude: -58.4123,
    geohash: '6ex2ug0d1',
    radiusKm: 10,
    source: 'saved',
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

const RADIUS_OPTIONS = [
  { value: '5', label: '5 km' },
  { value: '10', label: '10 km' },
];

describe('LocationPickerComponent', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [LocationPickerComponent, getTranslocoTestingModule()],
      providers: [
        {
          provide: LocationService,
          useValue: { staticMapUrl: vi.fn().mockReturnValue('https://api.mapbox.com/preview.png') },
        },
      ],
    });
    const fixture = TestBed.createComponent(LocationPickerComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should seed the query from searchLocation even when it arrives after creation', () => {
    const fixture = setup();
    expect(fixture.componentInstance.query()).toBe('');

    fixture.componentRef.setInput('searchLocation', searchLocation());
    fixture.detectChanges();

    expect(fixture.componentInstance.query()).toBe('Recoleta, Buenos Aires');
  });

  it('should keep a value the user typed even if searchLocation does not change', () => {
    const fixture = setup();

    fixture.componentInstance.onQueryChange('la lucila');

    expect(fixture.componentInstance.query()).toBe('la lucila');
  });

  it('should debounce query changes before emitting queryChanged', () => {
    vi.useFakeTimers();
    const fixture = setup();
    const emitted: string[] = [];
    fixture.componentInstance.queryChanged.subscribe((value) => emitted.push(value));

    fixture.componentInstance.onQueryChange('pal');
    fixture.componentInstance.onQueryChange('paler');
    expect(emitted).toEqual([]);

    vi.advanceTimersByTime(300);
    expect(emitted).toEqual(['paler']);
    vi.useRealTimers();
  });

  it('should ignore a result value with no matching suggestion', () => {
    const fixture = setup();
    const emitted: LocationSuggestion[] = [];
    fixture.componentInstance.suggestionSelected.subscribe((value) => emitted.push(value));

    fixture.componentInstance.onResultSelected({ value: 'unknown', label: 'Unknown' });

    expect(emitted).toEqual([]);
  });

  it('should disable the current-location button while resolving', () => {
    const fixture = setup();
    fixture.componentRef.setInput('isResolvingCurrentLocation', true);
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.um-location-picker__pin-button button',
    );
    expect(button.disabled).toBe(true);
  });

  it('should not render a map from a searchLocation with no coordinates, but should once a real pick is made', () => {
    const fixture = setup();
    fixture.componentRef.setInput('showConfirmButton', true);
    // Shaped like settings-profile-city's PublicCityInfo: a real place
    // name, but no latitude/longitude to plot.
    fixture.componentRef.setInput('searchLocation', { displayName: 'La Lucila, Buenos Aires' });
    fixture.componentRef.setInput('suggestions', [suggestion()]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('um-map')).toBeNull();

    fixture.componentInstance.onResultSelected({
      value: 'place.1',
      label: suggestion().displayName,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('um-map')).toBeTruthy();
  });

  describe('without showConfirmButton (immediate mode)', () => {
    it('should resolve and emit the full suggestion object from a picked result value', () => {
      const fixture = setup();
      fixture.componentRef.setInput('suggestions', [suggestion()]);
      fixture.detectChanges();
      const emitted: LocationSuggestion[] = [];
      fixture.componentInstance.suggestionSelected.subscribe((value) => emitted.push(value));

      fixture.componentInstance.onResultSelected({
        value: 'place.1',
        label: 'Palermo, Buenos Aires',
      });

      expect(emitted).toEqual([suggestion()]);
    });

    it('should emit useCurrentLocationRequested when the button is clicked', () => {
      const fixture = setup();
      const emitted: unknown[] = [];
      fixture.componentInstance.useCurrentLocationRequested.subscribe((value) =>
        emitted.push(value),
      );

      const button: HTMLButtonElement = fixture.nativeElement.querySelector(
        '.um-location-picker__pin-button button',
      );
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(emitted.length).toBe(1);
    });

    it('should render the map (showMap defaults true) with no radius circle and no confirm button', () => {
      const fixture = setup();
      fixture.componentRef.setInput('searchLocation', searchLocation());
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('um-map')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('ul-select')).toBeNull();
      expect(fixture.nativeElement.querySelector('.um-location-picker__confirm-button')).toBeNull();
    });

    it('should render no map at all when showMap is false', () => {
      const fixture = setup();
      fixture.componentRef.setInput('searchLocation', searchLocation());
      fixture.componentRef.setInput('showMap', false);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('um-map')).toBeNull();
    });

    it('should show the radius select but no confirm button when radiusOptions is set without showConfirmButton', () => {
      const fixture = setup();
      fixture.componentRef.setInput('radiusOptions', RADIUS_OPTIONS);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('ul-select')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.um-location-picker__confirm-button')).toBeNull();
    });

    it('should show the confirm button but no radius select when showConfirmButton is set without radiusOptions', () => {
      const fixture = setup();
      fixture.componentRef.setInput('showConfirmButton', true);
      fixture.componentRef.setInput('suggestions', [suggestion()]);
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector('.um-location-picker__confirm-button'),
      ).toBeTruthy();
      expect(fixture.nativeElement.querySelector('ul-select')).toBeNull();

      fixture.componentInstance.onResultSelected({
        value: 'place.1',
        label: suggestion().displayName,
      });
      fixture.detectChanges();

      expect(fixture.componentInstance.pendingArea()?.displayName).toBe('Palermo, Buenos Aires');
      expect(fixture.nativeElement.querySelector('um-map')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.um-map__radius')).toBeNull();
    });

    it('should never emit confirmed', () => {
      const fixture = setup();
      fixture.componentRef.setInput('suggestions', [suggestion()]);
      fixture.detectChanges();
      const emitted: LocationPickerConfirmedEvent[] = [];
      fixture.componentInstance.confirmed.subscribe((value) => emitted.push(value));

      fixture.componentInstance.onResultSelected({
        value: 'place.1',
        label: suggestion().displayName,
      });

      expect(emitted).toEqual([]);
    });
  });

  describe('with showConfirmButton and radiusOptions (modal mode)', () => {
    function setupConfirmMode() {
      const fixture = setup();
      fixture.componentRef.setInput('showConfirmButton', true);
      fixture.componentRef.setInput('radiusOptions', RADIUS_OPTIONS);
      fixture.componentRef.setInput('suggestions', [suggestion()]);
      fixture.detectChanges();
      return fixture;
    }

    it('should render the radius select and a disabled confirm button, but no map, until a point is pending', () => {
      const fixture = setupConfirmMode();

      expect(fixture.nativeElement.querySelector('ul-select')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('um-map')).toBeNull();
      const confirmButton: HTMLButtonElement = fixture.nativeElement.querySelector(
        '.um-location-picker__confirm-button button',
      );
      expect(confirmButton.disabled).toBe(true);
    });

    it('should only stage a pending pick, not emit suggestionSelected, when a suggestion is picked', () => {
      const fixture = setupConfirmMode();
      const emitted: LocationSuggestion[] = [];
      fixture.componentInstance.suggestionSelected.subscribe((value) => emitted.push(value));

      fixture.componentInstance.onResultSelected({
        value: 'place.1',
        label: suggestion().displayName,
      });
      fixture.detectChanges();

      expect(emitted).toEqual([]);
      expect(fixture.componentInstance.pendingArea()?.displayName).toBe('Palermo, Buenos Aires');
      expect(fixture.nativeElement.querySelector('um-map')).toBeTruthy();
    });

    it('should emit confirmed with the pending area/radius/source once "Set location" is clicked', () => {
      const fixture = setupConfirmMode();
      fixture.componentInstance.onResultSelected({
        value: 'place.1',
        label: suggestion().displayName,
      });
      fixture.componentInstance.onRadiusChange('5');
      fixture.detectChanges();
      const emitted: LocationPickerConfirmedEvent[] = [];
      fixture.componentInstance.confirmed.subscribe((value) => emitted.push(value));

      fixture.componentInstance.onConfirm();

      expect(emitted).toEqual([
        expect.objectContaining({
          area: expect.objectContaining({ displayName: 'Palermo, Buenos Aires' }),
          radiusKm: 5,
          source: 'saved',
        }),
      ]);
    });

    it('should not emit confirmed when nothing is pending', () => {
      const fixture = setupConfirmMode();
      const emitted: LocationPickerConfirmedEvent[] = [];
      fixture.componentInstance.confirmed.subscribe((value) => emitted.push(value));

      fixture.componentInstance.onConfirm();

      expect(emitted).toEqual([]);
    });

    it('should ignore an unparsable radius change', () => {
      const fixture = setupConfirmMode();

      fixture.componentInstance.onRadiusChange(null);

      expect(fixture.componentInstance.pendingRadiusKm()).toBeNull();
    });

    it('should preview a freshly resolved current location, with source browser-geolocation on confirm', () => {
      const fixture = setupConfirmMode();
      const resolved = suggestion({ displayName: 'Current spot' });
      const resolvedArea = { ...resolved, geohash: 'abc123' };
      const emitted: LocationPickerConfirmedEvent[] = [];
      fixture.componentInstance.confirmed.subscribe((value) => emitted.push(value));

      fixture.componentRef.setInput('resolvedCurrentArea', resolvedArea);
      fixture.detectChanges();
      fixture.componentInstance.onConfirm();

      expect(emitted).toEqual([
        expect.objectContaining({ area: resolvedArea, source: 'browser-geolocation' }),
      ]);
    });

    it('should update the search box text to the resolved current location', () => {
      const fixture = setupConfirmMode();
      fixture.componentInstance.onQueryChange('something the user typed');
      const resolvedArea = { ...suggestion({ displayName: 'Current spot' }), geohash: 'abc123' };

      fixture.componentRef.setInput('resolvedCurrentArea', resolvedArea);
      fixture.detectChanges();

      expect(fixture.componentInstance.query()).toBe('Current spot');
    });

    it('should re-seed the pending pick/radius whenever searchLocation changes', () => {
      const fixture = setupConfirmMode();

      fixture.componentRef.setInput('searchLocation', searchLocation());
      fixture.detectChanges();

      expect(fixture.componentInstance.pendingArea()?.displayName).toBe('Recoleta, Buenos Aires');
      expect(fixture.componentInstance.pendingRadiusKm()).toBe(10);
    });

    it('should draw the radius circle once a radius is pending', () => {
      const fixture = setupConfirmMode();

      fixture.componentRef.setInput('searchLocation', searchLocation());
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.um-map__radius')).toBeTruthy();
    });

    it('should show the map with no circle when a point is pending but no radius value is set yet', () => {
      const fixture = setupConfirmMode();

      fixture.componentInstance.onResultSelected({
        value: 'place.1',
        label: suggestion().displayName,
      });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('um-map')).toBeTruthy();
      expect(fixture.componentInstance.pendingRadiusKm()).toBeNull();
      expect(fixture.nativeElement.querySelector('.um-map__radius')).toBeNull();
    });

    it('should hide the radius circle when showRadius is false, map and pick unaffected', () => {
      const fixture = setupConfirmMode();

      fixture.componentRef.setInput('searchLocation', searchLocation());
      fixture.componentRef.setInput('showRadius', false);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('um-map')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.um-map__radius')).toBeNull();
    });
  });
});
