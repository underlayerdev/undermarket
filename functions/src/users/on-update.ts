import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { firestore } from '../admin';
import { getDisplayNameFormatError, normalizeDisplayName } from './display-name';

export type UserProfileData = Record<string, unknown>;

const USERS_COLLECTION = 'users';

// The same rule changeDisplayName enforces. Names written by Cloud Functions
// (the Google name onUserCreate seeds) never went through that callable, so
// this is what keeps an invalid one from completing onboarding.
function isValidDisplayName(displayName: unknown): boolean {
  return (
    typeof displayName === 'string' &&
    getDisplayNameFormatError(normalizeDisplayName(displayName)) === null
  );
}

/**
 * The only place `onboarded` ever flips to true — firestore.rules forbids
 * clients from changing it themselves (see the `users/{userId}` update
 * rule), so completing onboarding is exclusively a server-side decision.
 * Each onboarding step now saves its own field as the user continues (name,
 * then photo), rather than one write at the very end, so this reacts to
 * whichever of those writes is the one that first makes the profile valid.
 *
 * Only looks at `after`: a not-yet-onboarded profile with a valid
 * displayName is exactly the condition to act on, regardless of what
 * changed to get there. Checking `after.onboarded` (rather than whether it
 * *changed* from the previous write) is also what makes this idempotent —
 * the update this function itself makes has `after.onboarded === true`, so
 * the trigger it fires immediately no-ops instead of looping.
 */
export async function handleUserProfileUpdate(
  after: UserProfileData,
  userId: string,
): Promise<void> {
  if (after['onboarded'] !== false) return;
  if (!isValidDisplayName(after['displayName'])) return;

  await firestore.doc(`${USERS_COLLECTION}/${userId}`).update({ onboarded: true });
}

export const onUserProfileUpdated = onDocumentUpdated(
  `${USERS_COLLECTION}/{userId}`,
  async (event) => {
    const after = event.data?.after.data();
    if (!after) return;
    await handleUserProfileUpdate(after, event.params.userId);
  },
);
