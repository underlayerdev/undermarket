import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { firestore } from '../admin';

export type UserProfileData = Record<string, unknown>;

const USERS_COLLECTION = 'users';

// Keep in sync with src/app/domain/user/user-constraints.ts.
const DISPLAY_NAME_MIN_LENGTH = 2;
const DISPLAY_NAME_MAX_LENGTH = 50;

function isValidDisplayName(displayName: unknown): boolean {
  return (
    typeof displayName === 'string' &&
    displayName.length >= DISPLAY_NAME_MIN_LENGTH &&
    displayName.length <= DISPLAY_NAME_MAX_LENGTH
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

export const onUserProfileUpdated = onDocumentUpdated(`${USERS_COLLECTION}/{userId}`, async (event) => {
  const after = event.data?.after.data();
  if (!after) return;
  await handleUserProfileUpdate(after, event.params.userId);
});
