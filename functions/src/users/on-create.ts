import { auth } from 'firebase-functions/v1';
import { firestore } from '../admin';

export type UserRecord = auth.UserRecord;

const USERS_COLLECTION = 'users';

// Keep in sync with src/app/domain/user/user.model.ts's AuthProviderId.
const DEFAULT_PROVIDER_ID = 'password';

// The only place a users/{uid} doc is ever created — clients can't (see
// firestore.rules' `allow create: if false` on this collection). Fires
// exactly once per new Firebase Auth user, regardless of provider, so this
// single trigger covers both email/password and Google sign-up.
export async function handleUserCreate(user: UserRecord): Promise<void> {
  await firestore.doc(`${USERS_COLLECTION}/${user.uid}`).set({
    email: user.email ?? '',
    // Left blank for email/password signups — onboarding asks properly.
    // Pre-filled for Google, which already supplies a real name/photo.
    displayName: user.displayName ?? '',
    photoUrl: user.photoURL ?? null,
    settings: { language: 'en' },
    providerId: user.providerData[0]?.providerId ?? DEFAULT_PROVIDER_ID,
    createdAt: new Date(),
    onboarded: false,
    profileCity: null,
  });
}

export const onUserCreate = auth.user().onCreate(handleUserCreate);
