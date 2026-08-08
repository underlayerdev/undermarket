import { CATEGORIES } from '../constants/categories';
import type { Category } from '../constants/categories';
import {
  LISTING_DESCRIPTION_MAX_LENGTH,
  LISTING_MAX_PRICE,
  LISTING_TITLE_MAX_LENGTH,
} from '../constants/listing-constraints';
import type { Listing } from '../../domain/models/listing.model';

export type NewListingInput = Omit<Listing, 'id' | 'createdAt' | 'updatedAt' | 'imageUrls'>;

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

  if (!Number.isFinite(data.price) || data.price < 0) return 'Price must be 0 or more.';
  if (data.price > LISTING_MAX_PRICE) return `Price must be at most ${LISTING_MAX_PRICE}.`;

  if (!CATEGORIES.includes(data.category as Category)) return 'Please select a valid category.';

  if (data.status !== 'active') return 'New listings must start as active.';

  return null;
}
