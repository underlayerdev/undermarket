import { Pipe, PipeTransform } from '@angular/core';
import { CurrencyCode, DEFAULT_CURRENCY, getCurrency } from '../../domain/currency/currency.model';

@Pipe({ name: 'listingPrice' })
export class ListingPricePipe implements PipeTransform {
  // currencyCode can be missing on listings created before currency
  // support was added — fall back to the default currency's symbol. An
  // unrecognized but present code (e.g. from a future currency) still
  // displays as-is rather than being hidden.
  transform(price: number, currencyCode: CurrencyCode | null | undefined): string {
    const symbol = currencyCode
      ? (getCurrency(currencyCode)?.symbol ?? currencyCode)
      : getCurrency(DEFAULT_CURRENCY)!.symbol;
    const amount = price.toLocaleString('en-US');
    return `${symbol} ${amount}`;
  }
}
