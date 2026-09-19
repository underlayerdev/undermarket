// These limits are also enforced server-side in firestore.rules — keep both
// in sync. Chosen to match common practice for a "display name" field (as
// opposed to a unique @handle): Twitter/X and Facebook cap it at 50, while
// Discord/Instagram sit lower (30-32); a floor of 2 rules out single-
// character/blank-looking names without being restrictive for real names.
export const DISPLAY_NAME_MIN_LENGTH = 2;
export const DISPLAY_NAME_MAX_LENGTH = 50;
