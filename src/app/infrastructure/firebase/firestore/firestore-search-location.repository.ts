import { inject, Injectable } from '@angular/core';
import { doc, getDoc, setDoc, Firestore, Timestamp } from 'firebase/firestore';
import { FIREBASE_FIRESTORE } from '../../../core/configuration/tokens';
import type { SearchLocationRepository } from '../../../domain/location/search-location.repository';
import type { LocationSource, SearchLocation } from '../../../domain/location/location.model';
import type { UserId } from '../../../domain/user/user.model';

@Injectable({ providedIn: 'root' })
export class FirestoreSearchLocationRepository implements SearchLocationRepository {
  private readonly firestore: Firestore = inject(FIREBASE_FIRESTORE);

  async getByUser(userId: UserId): Promise<SearchLocation | null> {
    const snapshot = await getDoc(doc(this.firestore, 'userSearchLocations', userId));
    if (!snapshot.exists()) return null;
    return this.mapDoc(snapshot.data());
  }

  async save(userId: UserId, location: SearchLocation): Promise<void> {
    const { updatedAt, ...data } = location;
    await setDoc(
      doc(this.firestore, 'userSearchLocations', userId),
      { ...data, updatedAt: Timestamp.now() },
      { merge: true },
    );
  }

  private mapDoc(data: Record<string, unknown>): SearchLocation {
    const updatedAt = data['updatedAt'] as Timestamp | undefined;
    return {
      displayName: data['displayName'] as string,
      countryCode: data['countryCode'] as string,
      region: data['region'] as string,
      city: data['city'] as string,
      latitude: data['latitude'] as number,
      longitude: data['longitude'] as number,
      geohash: data['geohash'] as string,
      radiusKm: data['radiusKm'] as number,
      source: data['source'] as LocationSource,
      updatedAt: updatedAt ? updatedAt.toDate() : new Date(),
      ...(data['neighborhood'] ? { neighborhood: data['neighborhood'] as string } : {}),
    };
  }
}
