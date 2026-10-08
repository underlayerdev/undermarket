import { inject, Injectable } from '@angular/core';
import { deleteDoc, doc, getDoc, setDoc, Firestore } from 'firebase/firestore';
import { FIREBASE_FIRESTORE } from '../../../core/configuration/tokens';
import { DEFAULT_LANGUAGE } from '../../../core/i18n/languages';
import type { UserRepository } from '../../../domain/user/user.repository';
import type { User, UserId, UserSettings } from '../../../domain/user/user.model';

interface UsernameEntry {
  uid: UserId;
  /** Set once the owner has moved to another handle — see USERNAME_RELEASE_LOCK_DAYS. */
  lockedUntil?: { toDate(): Date };
}

@Injectable({ providedIn: 'root' })
export class FirestoreUserRepository implements UserRepository {
  private readonly firestore: Firestore = inject(FIREBASE_FIRESTORE);

  async getById(id: UserId): Promise<User | null> {
    const snapshot = await getDoc(doc(this.firestore, 'users', id));
    if (!snapshot.exists()) return null;
    return this.mapDoc(id, snapshot.data());
  }

  // `usernames/{username}` is the uniqueness index maintained by the
  // claimUsername callable (functions/src/users/claim-username.ts) — one doc
  // per handle, keyed by the handle itself, so a lookup is a single get.
  async getByUsername(username: string): Promise<User | null> {
    const entry = await this.getUsernameEntry(username);
    return entry ? this.getById(entry.uid) : null;
  }

  // Mirrors isClaimable() in functions/src/users/username.ts — this is only
  // the form's early hint; the callable re-checks inside its transaction.
  async isUsernameAvailable(username: string, userId: UserId): Promise<boolean> {
    const entry = await this.getUsernameEntry(username);
    if (!entry || entry.uid === userId) return true;
    return !!entry.lockedUntil && entry.lockedUntil.toDate() <= new Date();
  }

  // No create() — users/{uid} is created exclusively by the onUserCreate
  // Cloud Function (functions/src/users/on-create.ts); firestore.rules
  // denies client create entirely.
  //
  // `onboarded` is deliberately never part of this payload — it's a
  // server-only field. The client just writes a valid displayName as each
  // onboarding step completes; a Firestore trigger
  // (functions/src/users/on-update.ts) is what flips onboarded to true once
  // it sees one, and firestore.rules rejects any client write that tries to
  // change it itself.
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
        // null (not omitted) when absent: profileCity being unset must
        // actually clear any previously-stored value on an update, not leave
        // a stale one behind — see the field's doc comment on User.
        profileCity: user.profileCity ?? null,
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

  private async getUsernameEntry(username: string): Promise<UsernameEntry | null> {
    const snapshot = await getDoc(doc(this.firestore, 'usernames', username));
    return snapshot.exists() ? (snapshot.data() as UsernameEntry) : null;
  }

  private mapDoc(id: UserId, data: Record<string, unknown>): User {
    const createdAt = data['createdAt'] as { toDate(): Date } | undefined;
    const usernameChangedAt = data['usernameChangedAt'] as { toDate(): Date } | undefined;
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
      // Docs written before this field existed have no onboarding to do —
      // treat absence as already-onboarded (grandfathered), not as false.
      // `??` only falls back when the key is truly absent, so an explicit
      // `false` written by onUserCreate is preserved correctly.
      onboarded: (data['onboarded'] as boolean | undefined) ?? true,
      // Omitted (not set to undefined) when absent, matching Listing's
      // sourceProvider/sourceId convention — update() spreads this object
      // straight into setDoc(), and a caller round-tripping this object
      // shouldn't accidentally reintroduce a `profileCity: undefined` key.
      ...(data['profileCity'] ? { profileCity: data['profileCity'] as User['profileCity'] } : {}),
      // Never written back by update() — both are server-owned (see the
      // field docs on User), so they're read-only from the client's side.
      // Every profile has a username (onUserCreate assigns it before the doc
      // exists), so there's no fallback here on purpose: a missing one is a
      // data bug that should surface, not a state to render around.
      username: data['username'] as string,
      ...(usernameChangedAt ? { usernameChangedAt: usernameChangedAt.toDate() } : {}),
    };
  }
}
