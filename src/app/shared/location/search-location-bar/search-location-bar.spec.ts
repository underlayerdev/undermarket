import { TestBed } from '@angular/core/testing';
import { SearchLocationBarComponent } from './search-location-bar';
import type { SearchLocation } from '../../../domain/location/location.model';

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

describe('SearchLocationBarComponent', () => {
  function setup() {
    TestBed.configureTestingModule({ imports: [SearchLocationBarComponent] });
    return TestBed.createComponent(SearchLocationBarComponent);
  }

  it('should create', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should auto-open with first-run copy when there is no search location yet', () => {
    const fixture = setup();
    fixture.componentRef.setInput('firstRunTitle', 'Where should we search?');
    fixture.detectChanges();

    expect(fixture.componentInstance.open()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Where should we search?');
  });

  it('should not auto-open once a search location is set', () => {
    const fixture = setup();
    fixture.componentRef.setInput('searchLocation', searchLocation());
    fixture.detectChanges();

    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('should display the current search location and radius label', () => {
    const fixture = setup();
    fixture.componentRef.setInput('searchLocation', searchLocation());
    fixture.componentRef.setInput('withinRadiusLabel', 'Within 10 km');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Palermo, Buenos Aires');
    expect(fixture.nativeElement.textContent).toContain('Within 10 km');
  });

  it('should emit areaSelected with a geocoded LocationArea and close the modal', () => {
    const fixture = setup();
    const emitted: unknown[] = [];
    fixture.componentInstance.areaSelected.subscribe((value) => emitted.push(value));
    fixture.componentInstance.open.set(true);

    fixture.componentInstance.onAreaPicked({
      id: 'place.1',
      displayName: 'Recoleta, Buenos Aires',
      countryCode: 'AR',
      region: 'Buenos Aires',
      city: 'Buenos Aires',
      neighborhood: 'Recoleta',
      latitude: -34.5875,
      longitude: -58.3974,
    });

    expect(emitted).toEqual([
      expect.objectContaining({
        displayName: 'Recoleta, Buenos Aires',
        geohash: expect.any(String),
      }),
    ]);
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('should emit radiusChanged with a parsed number', () => {
    const fixture = setup();
    const emitted: number[] = [];
    fixture.componentInstance.radiusChanged.subscribe((value) => emitted.push(value));

    fixture.componentInstance.onRadiusChange('25');

    expect(emitted).toEqual([25]);
  });

  it('should ignore a null radius change', () => {
    const fixture = setup();
    const emitted: number[] = [];
    fixture.componentInstance.radiusChanged.subscribe((value) => emitted.push(value));

    fixture.componentInstance.onRadiusChange(null);

    expect(emitted).toEqual([]);
  });

  it('should emit useCurrentLocationRequested when the button is clicked', () => {
    const fixture = setup();
    const emitted: void[] = [];
    fixture.componentInstance.useCurrentLocationRequested.subscribe(() => emitted.push(undefined));

    const buttons = fixture.nativeElement.querySelectorAll('ul-button button');
    (buttons[0] as HTMLButtonElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(emitted.length).toBe(1);
  });
});
