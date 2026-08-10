import { validateNewListing } from './listing.validator';
import type { NewListingInput } from './listing.validator';
import { getMaxPriceForCurrency } from '../currency/currency.model';
import { LISTING_DESCRIPTION_MAX_LENGTH, LISTING_TITLE_MAX_LENGTH } from './listing-constraints';

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
  it('should return null for a valid listing', () => {
    expect(validateNewListing(validInput())).toBeNull();
  });

  it('should reject an empty or whitespace-only title', () => {
    expect(validateNewListing(validInput({ title: '   ' }))).toBe('Title is required.');
  });

  it('should reject a title over the max length', () => {
    const title = 'a'.repeat(LISTING_TITLE_MAX_LENGTH + 1);
    expect(validateNewListing(validInput({ title }))).toContain('at most');
  });

  it('should reject an empty description', () => {
    expect(validateNewListing(validInput({ description: '' }))).toBe('Description is required.');
  });

  it('should reject a description over the max length', () => {
    const description = 'a'.repeat(LISTING_DESCRIPTION_MAX_LENGTH + 1);
    expect(validateNewListing(validInput({ description }))).toContain('at most');
  });

  it('should reject an unknown currency', () => {
    expect(validateNewListing(validInput({ currency: 'EUR' }))).toBe(
      'Please select a valid currency.',
    );
  });

  it('should reject a negative price', () => {
    expect(validateNewListing(validInput({ price: -1 }))).toBe('Price must be 0 or more.');
  });

  it('should reject a non-finite price', () => {
    expect(validateNewListing(validInput({ price: NaN }))).toBe('Price must be 0 or more.');
  });

  it('should reject a price over the max for the given currency', () => {
    const maxPrice = getMaxPriceForCurrency('USD');
    expect(validateNewListing(validInput({ currency: 'USD', price: maxPrice + 1 }))).toContain(
      'at most',
    );
  });

  it('should allow a price that would exceed the USD max but is within the ARS max', () => {
    const usdMax = getMaxPriceForCurrency('USD');
    expect(validateNewListing(validInput({ currency: 'ARS', price: usdMax + 1 }))).toBeNull();
  });

  it('should reject an unknown category', () => {
    expect(validateNewListing(validInput({ category: 'Not-A-Category' }))).toBe(
      'Please select a valid category.',
    );
  });

  it('should reject a status other than active', () => {
    expect(validateNewListing(validInput({ status: 'sold' }))).toBe(
      'New listings must start as active.',
    );
  });
});
