import type { Listing, ListingId } from './listing.model';
import type { GeoPoint } from '../location/location.model';
import type { UserId } from '../user/user.model';

export interface ListingSearchFilters {
  query?: string;
  category?: string;
}

export interface NearbySearchParams {
  center: GeoPoint;
  radiusKm: number;
  category?: string;
  query?: string;
}

export interface ListingRepository {
  getLatest(): Promise<Listing[]>;
  getById(id: ListingId): Promise<Listing | null>;
  getByOwner(ownerId: UserId): Promise<Listing[]>;
  // Unlike getByOwner (the owner's own management view, which includes
  // drafts), this is for anyone else viewing that owner's public profile —
  // active listings only, enforced by the query itself, not just by a
  // caller remembering to filter.
  getPublicByOwner(ownerId: UserId): Promise<Listing[]>;
  search(filters: ListingSearchFilters): Promise<Listing[]>;
  // Kept separate from search() rather than folding `near` into
  // ListingSearchFilters: this needs a fundamentally different query
  // strategy (N geohash-range queries + dedupe + exact-distance filter, not
  // a single `where`), mirroring the existing precedent of getLatest() and
  // search() being distinct methods rather than one branching internally.
  searchNearby(params: NearbySearchParams): Promise<Listing[]>;
  create(listing: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>): Promise<Listing>;
  update(listing: Listing): Promise<void>;
  delete(id: ListingId): Promise<void>;
}
