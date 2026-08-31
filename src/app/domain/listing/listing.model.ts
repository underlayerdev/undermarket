import type { Category } from '../category/category.model';
import type { CurrencyCode } from '../currency/currency.model';
import type { UserId } from '../user/user.model';

export type ListingId = string;

export type ListingStatus = 'active' | 'sold' | 'draft';

export type ListingSourceProvider = 'mercadolibre';

export interface Listing {
  id: ListingId;
  ownerId: UserId;
  title: string;
  description: string;
  price: number;
  currency: CurrencyCode;
  category: Category;
  imageUrls: string[];
  status: ListingStatus;
  createdAt: Date;
  updatedAt: Date;
  /** Set when this listing was imported from a third-party marketplace, e.g. for de-duping re-imports and an "Imported from X" badge. Absent for listings created directly in Undermarket. */
  sourceProvider?: ListingSourceProvider;
  /** The item id in the source provider's own system — paired with sourceProvider. */
  sourceId?: string;
}
