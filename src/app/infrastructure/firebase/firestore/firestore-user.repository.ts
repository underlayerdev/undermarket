import { inject, Injectable } from '@angular/core';
import { doc, getDoc, setDoc, updateDoc, Firestore } from 'firebase/firestore';
import { FIREBASE_FIRESTORE } from '../../../core/configuration/tokens';
import type { UserRepository } from '../../../domain/user/user.repository';
import type { User, UserId } from '../../../domain/user/user.model';

@Injectable({ providedIn: 'root' })
export class FirestoreUserRepository implements UserRepository {
  private readonly firestore: Firestore = inject(FIREBASE_FIRESTORE);

  async getById(id: UserId): Promise<User | null> {
    const snapshot = await getDoc(doc(this.firestore, 'users', id));
    if (!snapshot.exists()) return null;
    return this.mapDoc(id, snapshot.data());
  }

  async create(user: User): Promise<void> {
    await setDoc(doc(this.firestore, 'users', user.id), {
      email: user.email,
      displayName: user.displayName,
      photoUrl: user.photoUrl ?? null,
      settings: user.settings,
      createdAt: user.createdAt,
    });
  }

  async update(user: User): Promise<void> {
    await updateDoc(doc(this.firestore, 'users', user.id), {
      displayName: user.displayName,
      photoUrl: user.photoUrl ?? null,
      settings: user.settings,
    });
  }

  private mapDoc(id: UserId, data: Record<string, unknown>): User {
    return {
      id,
      email: data['email'] as string,
      displayName: data['displayName'] as string,
      photoUrl: (data['photoUrl'] as string | null) ?? undefined,
      settings: data['settings'] as User['settings'],
      createdAt: (data['createdAt'] as { toDate(): Date }).toDate(),
    };
  }
}
