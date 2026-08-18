export interface CurrencyOption {
  code: 'ARS' | 'USD';
  label: string;
  symbol: string;
  // Prices in ARS run much higher than USD due to inflation — cap per
  // currency instead of a single shared max. Also enforced in firestore.rules.
  maxPrice: number;
}

export const CURRENCIES: readonly CurrencyOption[] = [
  {
    code: 'ARS',
    label: $localize`:@@currency.ars:Argentine Peso (ARS)`,
    symbol: '$',
    maxPrice: 1_000_000_000,
  },
  {
    code: 'USD',
    label: $localize`:@@currency.usd:US Dollar (USD)`,
    symbol: 'US$',
    maxPrice: 1_000_000,
  },
];

export type CurrencyCode = CurrencyOption['code'];

export const DEFAULT_CURRENCY: CurrencyCode = 'ARS';

export function getCurrency(code: string): CurrencyOption | undefined {
  return CURRENCIES.find((currency) => currency.code === code);
}

export function getMaxPriceForCurrency(code: string): number {
  return (
    getCurrency(code)?.maxPrice ?? Math.min(...CURRENCIES.map((currency) => currency.maxPrice))
  );
}
