import { auth } from 'firebase-functions/v1';
import { firestore } from '../admin';
import { reserveUsername } from './assign-username';
import { usernameBase } from './username';

export type UserRecord = auth.UserRecord;

const USERS_COLLECTION = 'users';

// Keep in sync with src/app/domain/user/user.model.ts's AuthProviderId.
const DEFAULT_PROVIDER_ID = 'password';

// The only place a users/{uid} doc is ever created — clients can't (see
// firestore.rules' `allow create: if false` on this collection). Fires
// exactly once per new Firebase Auth user, regardless of provider, so this
// single trigger covers both email/password and Google sign-up.
//
// Also hands out the user's first @handle in the same transaction, so every
// profile has one from the moment it exists and nothing downstream has to
// cope with "no handle yet" — the user can swap it for one they like in
// settings (claimUsername). If no handle can be reserved the whole
// transaction fails and no profile is written, rather than one without it.
export async function handleUserCreate(user: UserRecord): Promise<void> {
  const now = new Date();
  await firestore.runTransaction(async (transaction) => {
    const username = await reserveUsername(
      transaction,
      user.uid,
      usernameBase(user.displayName, user.email),
      now,
    );
    transaction.set(firestore.doc(`${USERS_COLLECTION}/${user.uid}`), {
      email: user.email ?? '',
      // Left blank for email/password signups — onboarding asks properly.
      // Pre-filled for Google, which already supplies a real name/photo.
      displayName: user.displayName ?? '',
      photoUrl: user.photoURL ?? null,
      settings: { language: 'en' },
      providerId: user.providerData[0]?.providerId ?? DEFAULT_PROVIDER_ID,
      createdAt: now,
      onboarded: false,
      profileCity: null,
      username,
    });
  });
}

export const onUserCreate = auth.user().onCreate(handleUserCreate);
