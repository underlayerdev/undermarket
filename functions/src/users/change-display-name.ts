import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { firestore } from '../admin';
import { getDisplayNameFormatError, normalizeDisplayName } from './display-name';

const USERS_COLLECTION = 'users';

export interface ChangeDisplayNameResult {
  displayName: string;
}

/**
 * The only way a display name changes. firestore.rules pins
 * `users/{uid}.displayName` against client writes, because the format
 * (alphabets, look-alike characters, links, reserved names) needs checks a
 * rules expression can't express — RE2 has no backreferences and rules can't
 * normalize Unicode. The stored value is the normalized one, so what the
 * profile shows is what was validated.
 *
 * The `reason` detail names the broken rule (see DisplayNameFormatError) for
 * logs and clients that want to say more than "not allowed".
 */
export async function handleChangeDisplayName(
  uid: string,
  rawDisplayName: unknown,
): Promise<ChangeDisplayNameResult> {
  if (typeof rawDisplayName !== 'string') {
    throw new HttpsError('invalid-argument', 'A display name is required.');
  }
  const displayName = normalizeDisplayName(rawDisplayName);
  const reason = getDisplayNameFormatError(displayName);
  if (reason) {
    throw new HttpsError('invalid-argument', 'That display name is not allowed.', { reason });
  }

  const userRef = firestore.doc(`${USERS_COLLECTION}/${uid}`);
  if (!(await userRef.get()).exists) {
    throw new HttpsError('not-found', 'Profile not found.');
  }
  await userRef.update({ displayName });

  return { displayName };
}

export const changeDisplayName = onCall(async (request): Promise<ChangeDisplayNameResult> => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in.');
  }
  return handleChangeDisplayName(
    request.auth.uid,
    (request.data as { displayName?: unknown })?.displayName,
  );
});
