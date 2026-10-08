// These limits are also enforced server-side in firestore.rules — keep both
// in sync. Chosen to match common practice for a "display name" field (as
// opposed to a unique @handle): Twitter/X and Facebook cap it at 50, while
// Discord/Instagram sit lower (30-32); a floor of 2 rules out single-
// character/blank-looking names without being restrictive for real names.
export const DISPLAY_NAME_MIN_LENGTH = 2;
export const DISPLAY_NAME_MAX_LENGTH = 50;

// A unique, public @handle (User.username) — as opposed to displayName above.
// Also enforced server-side by functions/src/users/username.ts (the
// claimUsername callable is the only writer) — keep both in sync.
// 3-20 lowercase ASCII letters/digits plus `.`/`_` (never leading, trailing
// or doubled), same family as Instagram/Telegram/X. ASCII-only on purpose: a
// Cyrillic "а" that looks identical to a Latin "a" is how handles get
// impersonated.
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9]|[._](?![._]))*[a-z0-9]$/;
// How often a user may change their handle, and how long a released handle
// stays reserved for its previous owner — together they stop someone from
// swapping handles to impersonate the seller a buyer was just talking to.
export const USERNAME_CHANGE_COOLDOWN_DAYS = 30;
export const USERNAME_RELEASE_LOCK_DAYS = 14;
