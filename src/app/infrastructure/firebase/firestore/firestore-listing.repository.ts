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
import type { ListingRepository, ListingSearchFilters } from '../../../domain/repositories/listing.repository';
import type { Listing, ListingId } from '../../../domain/models/listing.model';
import type { UserId } from '../../../domain/models/user.model';

@Injectable({ providedIn: 'root' })
export class FirestoreListingRepository implements ListingRepository {
  private readonly firestore: Firestore = inject(FIREBASE_FIRESTORE);
  private readonly col = () => collection(this.firestore, 'listings');

  async getLatest(): Promise<Listing[]> {
    const q = query(this.col(), orderBy('createdAt', 'desc'), limit(20));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => this.mapDoc(d.id, d.data()));
  }

  async getById(id: ListingId): Promise<Listing | null> {
    const snapshot = await getDoc(doc(this.firestore, 'listings', id));
    if (!snapshot.exists()) return null;
    return this.mapDoc(id, snapshot.data());
  }

  async getByOwner(ownerId: UserId): Promise<Listing[]> {
    const q = query(this.col(), where('ownerId', '==', ownerId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => this.mapDoc(d.id, d.data()));
  }

  async search(filters: ListingSearchFilters): Promise<Listing[]> {
    const constraints = [];
    if (filters.category) constraints.push(where('category', '==', filters.category));
    constraints.push(orderBy('createdAt', 'desc'));
    const q = query(this.col(), ...constraints);
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map(d => this.mapDoc(d.id, d.data()));
    if (!filters.query) return results;
    const lower = filters.query.toLowerCase();
    return results.filter(
      l => l.title.toLowerCase().includes(lower) || l.description.toLowerCase().includes(lower),
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
      category: data['category'] as string,
      imageUrls: data['imageUrls'] as string[],
      status: data['status'] as Listing['status'],
      createdAt: (data['createdAt'] as Timestamp).toDate(),
      updatedAt: (data['updatedAt'] as Timestamp).toDate(),
    };
  }
}
