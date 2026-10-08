import { HttpsError, onCall } from 'firebase-functions/v2/https';
import type { Timestamp } from 'firebase-admin/firestore';
import { firestore } from '../admin';
import {
  cooldownEndsAt,
  isClaimable,
  isValidUsername,
  normalizeUsername,
  releaseLockUntil,
  USERNAMES_COLLECTION,
  type UsernameEntry,
} from './username';

const USERS_COLLECTION = 'users';

export interface ClaimUsernameResult {
  username: string;
  /** Epoch millis — callable responses are plain JSON, no Timestamps. */
  usernameChangedAt: number;
}

function toMillis(value: Timestamp | Date): number {
  return value instanceof Date ? value.getTime() : value.toMillis();
}

/**
 * The only way a handle changes after sign-up. Clients can't write
 * `users/{uid}.username` or anything under `usernames/` (firestore.rules),
 * because uniqueness needs both docs checked and written in one
 * transaction: the new `usernames/{username}` entry must still be free at
 * commit time, or two people racing for the same handle could both "win".
 *
 * The previous handle isn't deleted. It stays pointed at this user with a
 * `lockedUntil`, so for USERNAME_RELEASE_LOCK_DAYS nobody else can take it
 * (and old /u/<handle> links still resolve to them).
 */
export async function handleClaimUsername(
  uid: string,
  rawUsername: unknown,
  now = new Date(),
): Promise<ClaimUsernameResult> {
  if (typeof rawUsername !== 'string') {
    throw new HttpsError('invalid-argument', 'A username is required.');
  }
  const username = normalizeUsername(rawUsername);
  if (!isValidUsername(username)) {
    throw new HttpsError('invalid-argument', 'That username is not allowed.');
  }

  return firestore.runTransaction(async (transaction) => {
    const userRef = firestore.doc(`${USERS_COLLECTION}/${uid}`);
    const newEntryRef = firestore.doc(`${USERNAMES_COLLECTION}/${username}`);
    // All reads before any write — a Firestore transaction requirement.
    const [userSnapshot, newEntrySnapshot] = await Promise.all([
      transaction.get(userRef),
      transaction.get(newEntryRef),
    ]);

    if (!userSnapshot.exists) {
      throw new HttpsError('not-found', 'Profile not found.');
    }
    const user = userSnapshot.data() as {
      username?: string;
      usernameChangedAt?: Timestamp | Date;
    };

    if (user.username === username) {
      return {
        username,
        usernameChangedAt: user.usernameChangedAt
          ? toMillis(user.usernameChangedAt)
          : now.getTime(),
      };
    }
    // The handle assigned at sign-up has no usernameChangedAt, so the first
    // change is always allowed.
    if (user.usernameChangedAt && cooldownEndsAt(user.usernameChangedAt) > now) {
      throw new HttpsError('failed-precondition', 'You changed your username too recently.');
    }
    if (!isClaimable(newEntrySnapshot.data() as UsernameEntry | undefined, uid, now)) {
      throw new HttpsError('already-exists', 'That username is taken.');
    }

    // set() without merge, so reclaiming your own released handle also
    // clears its lockedUntil.
    transaction.set(newEntryRef, { uid, createdAt: now });
    if (user.username) {
      transaction.set(
        firestore.doc(`${USERNAMES_COLLECTION}/${user.username}`),
        { lockedUntil: releaseLockUntil(now) },
        { merge: true },
      );
    }
    transaction.update(userRef, { username, usernameChangedAt: now });

    return { username, usernameChangedAt: now.getTime() };
  });
}

export const claimUsername = onCall(async (request): Promise<ClaimUsernameResult> => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in.');
  }
  return handleClaimUsername(request.auth.uid, (request.data as { username?: unknown })?.username);
});
