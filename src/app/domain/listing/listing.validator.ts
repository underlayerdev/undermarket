import type { TranslocoService } from '@jsverse/transloco';
import { CATEGORIES } from '../category/category.model';
import type { Category } from '../category/category.model';
import { CURRENCIES, getMaxPriceForCurrency } from '../currency/currency.model';
import { LISTING_DESCRIPTION_MAX_LENGTH, LISTING_TITLE_MAX_LENGTH } from './listing-constraints';
import type { Listing } from './listing.model';

// currency/category are widened back to string: this is the boundary
// validateNewListing exists to check, so it must accept values that only
// claim to be a valid CurrencyCode/Category (e.g. via an "as" assertion)
// without actually being one.
export type NewListingInput = Omit<
  Listing,
  'id' | 'createdAt' | 'updatedAt' | 'imageUrls' | 'currency' | 'category'
> & {
  currency: string;
  category: string;
};

// Mirrors the constraints enforced server-side in firestore.rules — this is
// a defensive re-check before writing, not the security boundary itself.
export function validateNewListing(
  data: NewListingInput,
  transloco: TranslocoService,
): string | null {
  const title = data.title.trim();
  if (!title) return transloco.translate('newListing.errors.titleRequired');
  if (title.length > LISTING_TITLE_MAX_LENGTH) {
    return transloco.translate('newListing.errors.titleTooLong', {
      maxLength: LISTING_TITLE_MAX_LENGTH,
    });
  }

  const description = data.description.trim();
  if (!description) return transloco.translate('newListing.errors.descriptionRequired');
  if (description.length > LISTING_DESCRIPTION_MAX_LENGTH) {
    return transloco.translate('newListing.errors.descriptionTooLong', {
      maxLength: LISTING_DESCRIPTION_MAX_LENGTH,
    });
  }

  if (!CURRENCIES.some((currency) => currency.code === data.currency)) {
    return transloco.translate('newListing.errors.currencyInvalid');
  }

  const maxPrice = getMaxPriceForCurrency(data.currency);
  if (!Number.isFinite(data.price) || data.price < 0)
    return transloco.translate('newListing.errors.priceNegative');
  if (data.price > maxPrice)
    return transloco.translate('newListing.errors.priceTooHigh', { maxPrice });

  if (!CATEGORIES.includes(data.category as Category))
    return transloco.translate('newListing.errors.categoryInvalid');

  if (data.status !== 'active') return transloco.translate('newListing.errors.statusInvalid');

  return null;
}
