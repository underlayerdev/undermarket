import type { TranslocoService } from '@jsverse/transloco';
import { CONDITIONS } from '../condition/condition.model';
import { CURRENCIES, getMaxPriceForCurrency } from '../currency/currency.model';
import { validateLocationArea } from '../location/location.validator';
import type { LocationArea } from '../location/location.model';
import { LISTING_DESCRIPTION_MAX_LENGTH, LISTING_TITLE_MAX_LENGTH } from './listing-constraints';
import type { Listing } from './listing.model';

// Root categoryIds with no physical "condition" at all — keep in sync with
// CATEGORY_ROOTS_WITHOUT_CONDITION in
// src/app/application/category/category.service.ts and
// categoryRequiresCondition in firestore.rules.
const CATEGORY_ROOTS_WITHOUT_CONDITION = new Set<string>(['services']);

// currency/category/condition are widened back to string: this is the
// boundary validateNewListing exists to check, so it must accept values
// that only claim to be a valid CurrencyCode/Category/Condition (e.g. via
// an "as" assertion) without actually being one.
export type NewListingInput = Omit<
  Listing,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'imageUrls'
  | 'currency'
  | 'categoryId'
  | 'categoryPath'
  | 'condition'
  | 'location'
> & {
  currency: string;
  // Required (unlike Listing's own optional categoryId?/categoryPath?,
  // which stay optional only for backward compatibility with listings that
  // predate the category tree) — every listing created or edited through
  // this form always has a leaf picked via ul-category-picker.
  categoryId: string;
  categoryPath: string[];
  // Optional, unlike currency/category/categoryId above: some categories
  // have no physical "condition" at all (CategoryService.requiresCondition)
  // — omitted entirely for those rather than sent as a meaningless value,
  // mirrored by firestore.rules' isValidNewListing accepting its absence.
  condition?: string;
  location: LocationArea;
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

  // Mirrors the shape check in firestore.rules: a non-empty leaf id whose
  // path ends with itself.
  if (!data.categoryId || data.categoryPath.at(-1) !== data.categoryId) {
    return transloco.translate('newListing.errors.categoryInvalid');
  }

  // The real rule (mirrored from firestore.rules): required+valid for a
  // category that has one, absent for a category that doesn't — never
  // "anything goes when present, ignored when absent".
  const categoryRequiresCondition = !CATEGORY_ROOTS_WITHOUT_CONDITION.has(data.categoryPath[0]);
  if (categoryRequiresCondition) {
    if (!data.condition) return transloco.translate('newListing.errors.conditionRequired');
    if (!CONDITIONS.some((condition) => condition.value === data.condition)) {
      return transloco.translate('newListing.errors.conditionInvalid');
    }
  } else if (data.condition) {
    return transloco.translate('newListing.errors.conditionInvalid');
  }

  if (data.status !== 'active') return transloco.translate('newListing.errors.statusInvalid');

  const locationError = validateLocationArea(data.location, transloco);
  if (locationError) return locationError;

  return null;
}
