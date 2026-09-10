import { ListingPricePipe } from './listing-price.pipe';

describe('ListingPricePipe', () => {
  const pipe = new ListingPricePipe();

  it('should format an ARS price with the ARS symbol and thousands separators', () => {
    expect(pipe.transform(1234567, 'ARS')).toBe('$ 1,234,567');
  });

  it('should format a USD price with the USD symbol and thousands separators', () => {
    expect(pipe.transform(1500, 'USD')).toBe('US$ 1,500');
  });

  it('should format zero correctly', () => {
    expect(pipe.transform(0, 'USD')).toBe('US$ 0');
  });

  it('should fall back to the default currency symbol when the currency code is undefined', () => {
    expect(pipe.transform(100, undefined)).toBe('$ 100');
  });

  it('should fall back to the default currency symbol when the currency code is null', () => {
    expect(pipe.transform(100, null)).toBe('$ 100');
  });
});
