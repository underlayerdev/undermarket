import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  getCurrency,
  getMaxPriceForCurrency,
} from './currency.model';

describe('currency.model', () => {
  it('should include ARS and USD', () => {
    expect(CURRENCIES.map((c) => c.code)).toEqual(['ARS', 'USD']);
  });

  it('should default to ARS', () => {
    expect(DEFAULT_CURRENCY).toBe('ARS');
  });

  it('should look up a known currency by code', () => {
    expect(getCurrency('USD')?.symbol).toBe('US$');
  });

  it('should return undefined for an unknown currency code', () => {
    expect(getCurrency('EUR')).toBeUndefined();
  });

  it('should return the max price for a known currency', () => {
    expect(getMaxPriceForCurrency('ARS')).toBe(1_000_000_000);
  });

  it('should fall back to the smallest max price for an unknown currency', () => {
    expect(getMaxPriceForCurrency('EUR')).toBe(1_000_000);
  });
});
