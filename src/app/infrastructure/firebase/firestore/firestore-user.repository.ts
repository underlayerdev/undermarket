import { inject, Injectable } from '@angular/core';
import { deleteDoc, doc, getDoc, setDoc, Firestore } from 'firebase/firestore';
import { FIREBASE_FIRESTORE } from '../../../core/configuration/tokens';
import { DEFAULT_LANGUAGE } from '../../../core/i18n/languages';
import type { UserRepository } from '../../../domain/user/user.repository';
import type { User, UserId, UserSettings } from '../../../domain/user/user.model';

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
      providerId: user.providerId,
      createdAt: user.createdAt,
    });
  }

  // setDoc+merge rather than updateDoc: accounts created before the profile
  // doc was written on sign-in have no doc yet, and updateDoc rejects with
  // not-found on a missing document instead of creating it.
  async update(user: User): Promise<void> {
    await setDoc(
      doc(this.firestore, 'users', user.id),
      {
        email: user.email,
        displayName: user.displayName,
        photoUrl: user.photoUrl ?? null,
        settings: user.settings,
        providerId: user.providerId,
        createdAt: user.createdAt,
      },
      { merge: true },
    );
  }

  async updateSettings(id: UserId, settings: UserSettings): Promise<void> {
    await setDoc(doc(this.firestore, 'users', id), { settings }, { merge: true });
  }

  async delete(id: UserId): Promise<void> {
    await deleteDoc(doc(this.firestore, 'users', id));
  }

  private mapDoc(id: UserId, data: Record<string, unknown>): User {
    const createdAt = data['createdAt'] as { toDate(): Date } | undefined;
    return {
      id,
      email: data['email'] as string,
      displayName: data['displayName'] as string,
      photoUrl: (data['photoUrl'] as string | null) ?? undefined,
      // Docs written before `settings` existed have no language preference —
      // fall back rather than handing out `undefined` as UserSettings.
      settings: (data['settings'] as UserSettings | undefined) ?? { language: DEFAULT_LANGUAGE },
      // Docs written before providerId existed fall back to 'password' — this
      // only affects whether "Change password" shows for pre-existing users;
      // Auth itself (the source of truth for reauth) is unaffected.
      providerId: (data['providerId'] as User['providerId']) ?? 'password',
      createdAt: createdAt ? createdAt.toDate() : new Date(),
    };
  }
}
