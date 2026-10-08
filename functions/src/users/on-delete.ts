import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { firestore } from '../admin';
import { USERNAMES_COLLECTION } from './username';

const USERS_COLLECTION = 'users';

/**
 * Frees every handle a deleted account held — its current one and any it
 * released that are still locked to it. Account deletion is a plain client
 * delete of users/{uid} (FirestoreUserRepository.delete()), and clients
 * can't touch `usernames/`, so without this the handles would stay taken
 * forever by an account that no longer exists.
 */
export async function handleUserDeleted(userId: string): Promise<void> {
  const entries = await firestore.collection(USERNAMES_COLLECTION).where('uid', '==', userId).get();
  if (entries.empty) return;

  const batch = firestore.batch();
  for (const entry of entries.docs) {
    batch.delete(entry.ref);
  }
  await batch.commit();
}

export const onUserDeleted = onDocumentDeleted(`${USERS_COLLECTION}/{userId}`, async (event) => {
  await handleUserDeleted(event.params.userId);
});
