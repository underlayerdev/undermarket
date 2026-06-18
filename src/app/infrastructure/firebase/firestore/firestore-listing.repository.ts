// TODO: inject Firebase SDK — import { Firestore, collection, query, getDocs, addDoc, ... } from 'firebase/firestore'
import { Injectable } from '@angular/core';
import type { ListingRepository, ListingSearchFilters } from '../../../domain/repositories/listing.repository';
import type { Listing, ListingId } from '../../../domain/models/listing.model';
import type { UserId } from '../../../domain/models/user.model';

@Injectable({ providedIn: null })
export class FirestoreListingRepository implements ListingRepository {
  getLatest(): Promise<Listing[]> {
    throw new Error('Not implemented');
  }

  getById(_id: ListingId): Promise<Listing | null> {
    throw new Error('Not implemented');
  }

  getByOwner(_ownerId: UserId): Promise<Listing[]> {
    throw new Error('Not implemented');
  }

  search(_filters: ListingSearchFilters): Promise<Listing[]> {
    throw new Error('Not implemented');
  }

  create(_listing: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>): Promise<Listing> {
    throw new Error('Not implemented');
  }

  update(_listing: Listing): Promise<void> {
    throw new Error('Not implemented');
  }

  delete(_id: ListingId): Promise<void> {
    throw new Error('Not implemented');
  }
}
