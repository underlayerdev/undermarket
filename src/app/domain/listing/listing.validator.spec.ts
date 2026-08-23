import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { validateNewListing } from './listing.validator';
import type { NewListingInput } from './listing.validator';
import { getMaxPriceForCurrency } from '../currency/currency.model';
import { LISTING_DESCRIPTION_MAX_LENGTH, LISTING_TITLE_MAX_LENGTH } from './listing-constraints';
import { getTranslocoTestingModule } from '../../../testing/transloco-testing';

function validInput(overrides: Partial<NewListingInput> = {}): NewListingInput {
  return {
    ownerId: 'user-1',
    title: 'Vintage lamp',
    description: 'A nice lamp in good condition.',
    price: 25,
    currency: 'ARS',
    category: 'Furniture',
    status: 'active',
    ...overrides,
  };
}

describe('validateNewListing', () => {
  let transloco: TranslocoService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [getTranslocoTestingModule()] });
    transloco = TestBed.inject(TranslocoService);
  });

  it('should return null for a valid listing', () => {
    expect(validateNewListing(validInput(), transloco)).toBeNull();
  });

  it('should reject an empty or whitespace-only title', () => {
    expect(validateNewListing(validInput({ title: '   ' }), transloco)).toBe(
      'Title is required.',
    );
  });

  it('should reject a title over the max length', () => {
    const title = 'a'.repeat(LISTING_TITLE_MAX_LENGTH + 1);
    expect(validateNewListing(validInput({ title }), transloco)).toContain('at most');
  });

  it('should reject an empty description', () => {
    expect(validateNewListing(validInput({ description: '' }), transloco)).toBe(
      'Description is required.',
    );
  });

  it('should reject a description over the max length', () => {
    const description = 'a'.repeat(LISTING_DESCRIPTION_MAX_LENGTH + 1);
    expect(validateNewListing(validInput({ description }), transloco)).toContain('at most');
  });

  it('should reject an unknown currency', () => {
    expect(validateNewListing(validInput({ currency: 'EUR' }), transloco)).toBe(
      'Please select a valid currency.',
    );
  });

  it('should reject a negative price', () => {
    expect(validateNewListing(validInput({ price: -1 }), transloco)).toBe(
      'Price must be 0 or more.',
    );
  });

  it('should reject a non-finite price', () => {
    expect(validateNewListing(validInput({ price: NaN }), transloco)).toBe(
      'Price must be 0 or more.',
    );
  });

  it('should reject a price over the max for the given currency', () => {
    const maxPrice = getMaxPriceForCurrency('USD');
    expect(
      validateNewListing(validInput({ currency: 'USD', price: maxPrice + 1 }), transloco),
    ).toContain('at most');
  });

  it('should allow a price that would exceed the USD max but is within the ARS max', () => {
    const usdMax = getMaxPriceForCurrency('USD');
    expect(
      validateNewListing(validInput({ currency: 'ARS', price: usdMax + 1 }), transloco),
    ).toBeNull();
  });

  it('should reject an unknown category', () => {
    expect(validateNewListing(validInput({ category: 'Not-A-Category' }), transloco)).toBe(
      'Please select a valid category.',
    );
  });

  it('should reject a status other than active', () => {
    expect(validateNewListing(validInput({ status: 'sold' }), transloco)).toBe(
      'New listings must start as active.',
    );
  });
});
