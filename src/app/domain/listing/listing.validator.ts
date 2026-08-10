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
export function validateNewListing(data: NewListingInput): string | null {
  const title = data.title.trim();
  if (!title) return 'Title is required.';
  if (title.length > LISTING_TITLE_MAX_LENGTH) {
    return `Title must be at most ${LISTING_TITLE_MAX_LENGTH} characters.`;
  }

  const description = data.description.trim();
  if (!description) return 'Description is required.';
  if (description.length > LISTING_DESCRIPTION_MAX_LENGTH) {
    return `Description must be at most ${LISTING_DESCRIPTION_MAX_LENGTH} characters.`;
  }

  if (!CURRENCIES.some((c) => c.code === data.currency)) {
    return 'Please select a valid currency.';
  }

  const maxPrice = getMaxPriceForCurrency(data.currency);
  if (!Number.isFinite(data.price) || data.price < 0) return 'Price must be 0 or more.';
  if (data.price > maxPrice) return `Price must be at most ${maxPrice}.`;

  if (!CATEGORIES.includes(data.category as Category)) return 'Please select a valid category.';

  if (data.status !== 'active') return 'New listings must start as active.';

  return null;
}
