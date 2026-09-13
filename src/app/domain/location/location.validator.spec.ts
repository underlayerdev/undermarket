import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { validateLocationArea } from './location.validator';
import type { LocationArea } from './location.model';
import { getTranslocoTestingModule } from '../../../testing/transloco-testing';

function validArea(overrides: Partial<LocationArea> = {}): LocationArea {
  return {
    displayName: 'Palermo, Buenos Aires',
    countryCode: 'AR',
    region: 'Buenos Aires',
    city: 'Buenos Aires',
    neighborhood: 'Palermo',
    latitude: -34.5875,
    longitude: -58.4205,
    geohash: '6ex2ug0d0',
    ...overrides,
  };
}

describe('validateLocationArea', () => {
  let transloco: TranslocoService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [getTranslocoTestingModule()] });
    transloco = TestBed.inject(TranslocoService);
  });

  it('should return null for a valid area', () => {
    expect(validateLocationArea(validArea(), transloco)).toBeNull();
  });

  it('should reject a missing area', () => {
    expect(validateLocationArea(null, transloco)).toBe(
      'Please choose a location for this listing.',
    );
    expect(validateLocationArea(undefined, transloco)).toBe(
      'Please choose a location for this listing.',
    );
  });

  it('should reject an empty or whitespace-only display name', () => {
    expect(validateLocationArea(validArea({ displayName: '   ' }), transloco)).toBe(
      'Please choose a location for this listing.',
    );
  });

  it('should reject a display name over the max length', () => {
    const displayName = 'a'.repeat(121);
    expect(validateLocationArea(validArea({ displayName }), transloco)).toContain('at most');
  });

  it('should reject a non-two-letter country code', () => {
    expect(validateLocationArea(validArea({ countryCode: 'Argentina' }), transloco)).toBe(
      'Please select a valid location.',
    );
  });

  it('should reject an empty city', () => {
    expect(validateLocationArea(validArea({ city: '' }), transloco)).toBe(
      'Please select a valid location.',
    );
  });

  it('should reject an empty geohash', () => {
    expect(validateLocationArea(validArea({ geohash: '' }), transloco)).toBe(
      'Please select a valid location.',
    );
  });

  it('should reject an out-of-range latitude', () => {
    expect(validateLocationArea(validArea({ latitude: 91 }), transloco)).toBe(
      'Please select a valid location.',
    );
    expect(validateLocationArea(validArea({ latitude: -91 }), transloco)).toBe(
      'Please select a valid location.',
    );
  });

  it('should reject an out-of-range longitude', () => {
    expect(validateLocationArea(validArea({ longitude: 181 }), transloco)).toBe(
      'Please select a valid location.',
    );
    expect(validateLocationArea(validArea({ longitude: -181 }), transloco)).toBe(
      'Please select a valid location.',
    );
  });

  it('should reject a non-finite latitude', () => {
    expect(validateLocationArea(validArea({ latitude: NaN }), transloco)).toBe(
      'Please select a valid location.',
    );
  });
});
