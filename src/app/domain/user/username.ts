import { RESERVED_USERNAMES } from './reserved-usernames';
import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH, USERNAME_PATTERN } from './user-constraints';

export type UsernameFormatError = 'required' | 'tooShort' | 'tooLong' | 'invalid' | 'reserved';

/**
 * What the user typed → the canonical stored form. Handles are compared
 * case-insensitively by always storing them lowercase, and a leading `@` is
 * accepted since that's how people naturally write a handle.
 */
export function normalizeUsername(value: string): string {
  return value.trim().replace(/^@/, '').toLowerCase();
}

/** Expects an already-normalized value — see normalizeUsername(). */
export function getUsernameFormatError(username: string): UsernameFormatError | null {
  if (!username) return 'required';
  if (username.length < USERNAME_MIN_LENGTH) return 'tooShort';
  if (username.length > USERNAME_MAX_LENGTH) return 'tooLong';
  // All-digits would read like a phone number or an internal id.
  if (!USERNAME_PATTERN.test(username) || /^\d+$/.test(username)) return 'invalid';
  if (RESERVED_USERNAMES.has(username)) return 'reserved';
  return null;
}
