import type { Transaction } from 'firebase-admin/firestore';
import { firestore } from '../admin';
import { fallbackUsername, usernameCandidates, USERNAMES_COLLECTION } from './username';

// Ten readable candidates (the base, then random 4-digit suffixes) are tried
// first; all of them being taken would need thousands of users sharing one
// base, and then one long random fallback is tried on top.
const CANDIDATE_COUNT = 10;

/**
 * Reserves the first free handle derived from `base` for `uid`, inside the
 * caller's transaction, and returns it. Every account must have a handle, so
 * if even the fallback is taken this throws and the transaction rolls back —
 * never a user without one. The caller is responsible for writing it onto users/{uid} in the
 * same transaction — that's what keeps the index and the profile in step.
 *
 * Only ever reads before writing, so it can run first in a transaction that
 * writes afterwards.
 */
export async function reserveUsername(
  transaction: Transaction,
  uid: string,
  base: string,
  now: Date,
): Promise<string> {
  const candidates = [...usernameCandidates(base, CANDIDATE_COUNT), fallbackUsername()];
  const snapshots = await transaction.getAll(
    ...candidates.map((candidate) => firestore.doc(`${USERNAMES_COLLECTION}/${candidate}`)),
  );
  const index = snapshots.findIndex((snapshot) => !snapshot.exists);
  if (index === -1) throw new Error(`No free username found for user ${uid}.`);

  const username = candidates[index];
  transaction.set(firestore.doc(`${USERNAMES_COLLECTION}/${username}`), { uid, createdAt: now });
  return username;
}
