import type { Condition } from '../condition/condition.model';
import type { CurrencyCode } from '../currency/currency.model';
import type { ListingLocation } from '../location/location.model';
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
  /**
   * Leaf id in the `categories/{categoryId}` tree (see docs/categories-plan.md).
   * Absent on listings created before the tree existed and on any created
   * since that haven't been through the backfill (functions/src/categories/
   * backfill-listings.ts) — the old flat `category` field this replaced is
   * fully retired, so there's no fallback for a listing missing this.
   */
  categoryId?: string;
  /** Root→leaf ancestor ids for `categoryId`, denormalized at write time for `array-contains` filtering. */
  categoryPath?: string[];
  imageUrls: string[];
  status: ListingStatus;
  createdAt: Date;
  updatedAt: Date;
  /** Set when this listing was imported from a third-party marketplace, e.g. for de-duping re-imports and an "Imported from X" badge. Absent for listings created directly in Undermarket. */
  sourceProvider?: ListingSourceProvider;
  /** The item id in the source provider's own system — paired with sourceProvider. */
  sourceId?: string;
  /**
   * Approximate area the item is located in — never an exact address.
   * Optional for backward compatibility with listings created before this
   * field existed; required going forward (enforced by validateNewListing
   * and firestore.rules), so new/edited listings always have one.
   */
  location?: ListingLocation;
  /**
   * Physical condition of the item, Vinted-style (see condition.model.ts).
   * Optional for backward compatibility with listings created before this
   * field existed; required going forward (enforced by validateNewListing
   * and firestore.rules), so new/edited listings always have one.
   */
  condition?: Condition;
}
