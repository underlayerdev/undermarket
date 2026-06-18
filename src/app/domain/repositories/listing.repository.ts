import type { Listing, ListingId } from '../models/listing.model';
import type { UserId } from '../models/user.model';

export interface ListingSearchFilters {
  query?: string;
  category?: string;
}

export interface ListingRepository {
  getLatest(): Promise<Listing[]>;
  getById(id: ListingId): Promise<Listing | null>;
  getByOwner(ownerId: UserId): Promise<Listing[]>;
  search(filters: ListingSearchFilters): Promise<Listing[]>;
  create(listing: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>): Promise<Listing>;
  update(listing: Listing): Promise<void>;
  delete(id: ListingId): Promise<void>;
}
