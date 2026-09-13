import { TestBed } from '@angular/core/testing';
import { LocationPickerComponent } from './location-picker';
import type { LocationSuggestion } from '../../../domain/location/location.model';

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

describe('LocationPickerComponent', () => {
  function setup() {
    TestBed.configureTestingModule({ imports: [LocationPickerComponent] });
    const fixture = TestBed.createComponent(LocationPickerComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
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

  it('should resolve the full suggestion object from a picked result value', () => {
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

  it('should ignore a result value with no matching suggestion', () => {
    const fixture = setup();
    const emitted: LocationSuggestion[] = [];
    fixture.componentInstance.suggestionSelected.subscribe((value) => emitted.push(value));

    fixture.componentInstance.onResultSelected({ value: 'unknown', label: 'Unknown' });

    expect(emitted).toEqual([]);
  });

  it('should emit useCurrentLocationRequested when the button is clicked', () => {
    const fixture = setup();
    const emitted: void[] = [];
    fixture.componentInstance.useCurrentLocationRequested.subscribe(() => emitted.push(undefined));

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('ul-button button');
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(emitted.length).toBe(1);
  });

  it('should disable the current-location button while resolving', () => {
    const fixture = setup();
    fixture.componentRef.setInput('isResolvingCurrentLocation', true);
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('ul-button button');
    expect(button.disabled).toBe(true);
  });
});
