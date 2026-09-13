import { inject, Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
  Firestore,
  QueryConstraint,
  Timestamp,
} from 'firebase/firestore';
import { FIREBASE_FIRESTORE } from '../../../core/configuration/tokens';
import type {
  ListingRepository,
  ListingSearchFilters,
  NearbySearchParams,
} from '../../../domain/listing/listing.repository';
import { filterListingsByQuery } from '../../../domain/listing/listing-query.util';
import {
  filterWithinRadius,
  geohashQueryBoundsForRadius,
} from '../../../domain/location/geohash.util';
import type { Listing, ListingId } from '../../../domain/listing/listing.model';
import type { LocationArea } from '../../../domain/location/location.model';
import type { UserId } from '../../../domain/user/user.model';

@Injectable({ providedIn: 'root' })
export class FirestoreListingRepository implements ListingRepository {
  private readonly firestore: Firestore = inject(FIREBASE_FIRESTORE);
  private readonly col = () => collection(this.firestore, 'listings');

  async getLatest(): Promise<Listing[]> {
    const listingsQuery = query(
      this.col(),
      where('status', '!=', 'draft'),
      orderBy('createdAt', 'desc'),
      limit(20),
    );
    const snapshot = await getDocs(listingsQuery);
    return snapshot.docs.map((docSnapshot) => this.mapDoc(docSnapshot.id, docSnapshot.data()));
  }

  async getById(id: ListingId): Promise<Listing | null> {
    const snapshot = await getDoc(doc(this.firestore, 'listings', id));
    if (!snapshot.exists()) return null;
    return this.mapDoc(id, snapshot.data());
  }

  async getByOwner(ownerId: UserId): Promise<Listing[]> {
    const listingsQuery = query(
      this.col(),
      where('ownerId', '==', ownerId),
      orderBy('createdAt', 'desc'),
    );
    const snapshot = await getDocs(listingsQuery);
    return snapshot.docs.map((docSnapshot) => this.mapDoc(docSnapshot.id, docSnapshot.data()));
  }

  async getPublicByOwner(ownerId: UserId): Promise<Listing[]> {
    const listingsQuery = query(
      this.col(),
      where('ownerId', '==', ownerId),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
    );
    const snapshot = await getDocs(listingsQuery);
    return snapshot.docs.map((docSnapshot) => this.mapDoc(docSnapshot.id, docSnapshot.data()));
  }

  async search(filters: ListingSearchFilters): Promise<Listing[]> {
    const constraints: QueryConstraint[] = [where('status', '!=', 'draft')];
    if (filters.category) constraints.push(where('category', '==', filters.category));
    constraints.push(orderBy('createdAt', 'desc'));
    const listingsQuery = query(this.col(), ...constraints);
    const snapshot = await getDocs(listingsQuery);
    const results = snapshot.docs.map((docSnapshot) =>
      this.mapDoc(docSnapshot.id, docSnapshot.data()),
    );
    return filterListingsByQuery(results, filters.query);
  }

  // Firestore has no native radius query: this runs one range query per
  // geohash bounding box covering the requested radius (boxes can overlap,
  // hence the id-keyed dedupe), then applies the exact-distance filter the
  // technique requires (bounding boxes over-include the circle's corners).
  // status uses equality ('active') rather than the '!=' used elsewhere —
  // composing an inequality on status with the geohash range would need a
  // much fussier composite index, and nearby-browse never wants sold/draft
  // listings anyway. category/query stay client-side filters here too, to
  // avoid needing a second composite index per category.
  async searchNearby(params: NearbySearchParams): Promise<Listing[]> {
    const bounds = geohashQueryBoundsForRadius(params.center, params.radiusKm);
    const snapshots = await Promise.all(
      bounds.map(([start, end]) =>
        getDocs(
          query(
            this.col(),
            where('status', '==', 'active'),
            where('geohash', '>=', start),
            where('geohash', '<=', end),
            orderBy('geohash'),
          ),
        ),
      ),
    );

    const byId = new Map<string, Listing>();
    for (const snapshot of snapshots) {
      for (const docSnapshot of snapshot.docs) {
        byId.set(docSnapshot.id, this.mapDoc(docSnapshot.id, docSnapshot.data()));
      }
    }

    const withinRadius = filterWithinRadius(
      [...byId.values()],
      params.center,
      params.radiusKm,
      (listing) => listing.location,
    );
    const matchingQuery = filterListingsByQuery(withinRadius, params.query);
    return matchingQuery.filter(
      (listing) => !params.category || listing.category === params.category,
    );
  }

  async create(listing: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>): Promise<Listing> {
    const now = Timestamp.now();
    const geohash = listing.location?.geohash;
    const ref = await addDoc(this.col(), {
      ...listing,
      ...(geohash ? { geohash } : {}),
      createdAt: now,
      updatedAt: now,
    });
    return { ...listing, id: ref.id, createdAt: now.toDate(), updatedAt: now.toDate() };
  }

  async update(listing: Listing): Promise<void> {
    const { id, createdAt, ...data } = listing;
    const geohash = listing.location?.geohash;
    await updateDoc(doc(this.firestore, 'listings', id), {
      ...data,
      ...(geohash ? { geohash } : {}),
      updatedAt: Timestamp.now(),
    });
  }

  async delete(id: ListingId): Promise<void> {
    await deleteDoc(doc(this.firestore, 'listings', id));
  }

  private mapDoc(id: ListingId, data: Record<string, unknown>): Listing {
    return {
      id,
      ownerId: data['ownerId'] as string,
      title: data['title'] as string,
      description: data['description'] as string,
      price: data['price'] as number,
      currency: data['currency'] as Listing['currency'],
      category: data['category'] as Listing['category'],
      imageUrls: data['imageUrls'] as string[],
      status: data['status'] as Listing['status'],
      createdAt: (data['createdAt'] as Timestamp).toDate(),
      updatedAt: (data['updatedAt'] as Timestamp).toDate(),
      // Omitted (not set to undefined) when absent: update() spreads this
      // object straight into updateDoc(), which throws on literal undefined
      // field values — every pre-existing listing lacks these fields.
      ...(data['sourceProvider']
        ? { sourceProvider: data['sourceProvider'] as Listing['sourceProvider'] }
        : {}),
      ...(data['sourceId'] ? { sourceId: data['sourceId'] as Listing['sourceId'] } : {}),
      // `location` carries its own `geohash` (for round-tripping); the
      // top-level `geohash` field alongside it exists purely so Firestore
      // can range-query on it and is never read back here.
      ...(data['location'] ? { location: data['location'] as LocationArea } : {}),
    };
  }
}
