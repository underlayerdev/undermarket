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
  Timestamp,
} from 'firebase/firestore';
import { FIREBASE_FIRESTORE } from '../../../core/configuration/tokens';
import type {
  ListingRepository,
  ListingSearchFilters,
} from '../../../domain/listing/listing.repository';
import type { Listing, ListingId } from '../../../domain/listing/listing.model';
import type { UserId } from '../../../domain/user/user.model';

@Injectable({ providedIn: 'root' })
export class FirestoreListingRepository implements ListingRepository {
  private readonly firestore: Firestore = inject(FIREBASE_FIRESTORE);
  private readonly col = () => collection(this.firestore, 'listings');

  async getLatest(): Promise<Listing[]> {
    const listingsQuery = query(this.col(), orderBy('createdAt', 'desc'), limit(20));
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

  async search(filters: ListingSearchFilters): Promise<Listing[]> {
    const constraints = [];
    if (filters.category) constraints.push(where('category', '==', filters.category));
    constraints.push(orderBy('createdAt', 'desc'));
    const listingsQuery = query(this.col(), ...constraints);
    const snapshot = await getDocs(listingsQuery);
    const results = snapshot.docs.map((docSnapshot) =>
      this.mapDoc(docSnapshot.id, docSnapshot.data()),
    );
    if (!filters.query) return results;
    const lower = filters.query.toLowerCase();
    return results.filter(
      (listing) =>
        listing.title.toLowerCase().includes(lower) ||
        listing.description.toLowerCase().includes(lower),
    );
  }

  async create(listing: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>): Promise<Listing> {
    const now = Timestamp.now();
    const ref = await addDoc(this.col(), { ...listing, createdAt: now, updatedAt: now });
    return { ...listing, id: ref.id, createdAt: now.toDate(), updatedAt: now.toDate() };
  }

  async update(listing: Listing): Promise<void> {
    const { id, createdAt, ...data } = listing;
    await updateDoc(doc(this.firestore, 'listings', id), { ...data, updatedAt: Timestamp.now() });
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
    };
  }
}
