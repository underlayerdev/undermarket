import type { Timestamp } from 'firebase-admin/firestore';

// Keep in sync with src/app/domain/user/user-constraints.ts,
// src/app/domain/user/username.ts and src/app/domain/user/reserved-usernames.ts.
// This copy is the enforcement; the client's is only for early form feedback.
export const USERNAMES_COLLECTION = 'usernames';
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9]|[._](?![._]))*[a-z0-9]$/;
export const USERNAME_CHANGE_COOLDOWN_DAYS = 30;
export const USERNAME_RELEASE_LOCK_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  // Routes
  'api',
  'discover',
  'forgot-password',
  'home',
  'listings',
  'login',
  'logout',
  'new',
  'onboarding',
  'profile',
  'register',
  'reset-password',
  'search',
  'settings',
  'u',
  // Staff / brand
  'admin',
  'administrator',
  'help',
  'moderator',
  'official',
  'root',
  'security',
  'staff',
  'support',
  'system',
  'team',
  'underlayer',
  'undermarket',
  // Premium pool
  'buy',
  'deals',
  'free',
  'market',
  'sale',
  'sell',
  'shop',
  'store',
]);

/** Shape of a `usernames/{username}` index doc. */
export interface UsernameEntry {
  uid: string;
  createdAt: Timestamp | Date;
  /** Set when the owner moved to another handle; until then it's theirs alone. */
  lockedUntil?: Timestamp | Date;
}

export function normalizeUsername(value: string): string {
  return value.trim().replace(/^@/, '').toLowerCase();
}

/** Expects an already-normalized value. */
export function isValidUsername(username: string): boolean {
  return (
    username.length >= USERNAME_MIN_LENGTH &&
    username.length <= USERNAME_MAX_LENGTH &&
    USERNAME_PATTERN.test(username) &&
    !/^\d+$/.test(username) &&
    !RESERVED_USERNAMES.has(username)
  );
}

function toDate(value: Timestamp | Date): Date {
  return value instanceof Date ? value : value.toDate();
}

/**
 * Whether `uid` may take a handle whose index doc is `entry`: free, already
 * theirs (including one they released and want back), or released by
 * someone else long enough ago that the lock has expired.
 */
export function isClaimable(entry: UsernameEntry | undefined, uid: string, now: Date): boolean {
  if (!entry || entry.uid === uid) return true;
  return !!entry.lockedUntil && toDate(entry.lockedUntil) <= now;
}

export function releaseLockUntil(now: Date): Date {
  return new Date(now.getTime() + USERNAME_RELEASE_LOCK_DAYS * DAY_MS);
}

export function cooldownEndsAt(changedAt: Timestamp | Date): Date {
  return new Date(toDate(changedAt).getTime() + USERNAME_CHANGE_COOLDOWN_DAYS * DAY_MS);
}

/**
 * Best-effort readable starting point for an auto-assigned handle, from the
 * Google display name or the email's local part — "Jane Doe" → "jane.doe".
 * Accents are folded to ASCII ("José" → "jose"), anything else outside the
 * allowed set is dropped. Falls back to "user" when nothing usable is left;
 * the caller appends digits until the result is valid and free.
 */
export function usernameBase(
  displayName: string | null | undefined,
  email: string | null | undefined,
): string {
  const source = displayName?.trim() || email?.split('@')[0] || '';
  const base = source
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._]/g, '')
    .replace(/[._]{2,}/g, '.')
    .replace(/^[._]+|[._]+$/g, '')
    // Leave room for the numeric suffix candidates add.
    .slice(0, USERNAME_MAX_LENGTH - 5)
    .replace(/[._]+$/, '');
  // An all-digits base would stay all-digits with a numeric suffix too.
  return base.length >= USERNAME_MIN_LENGTH && !/^\d+$/.test(base) ? base : 'user';
}

/**
 * Last-resort candidate once the readable ones are all taken: "u" plus ten
 * random digits (11 chars, never all digits). Ten digits is 10^10 options, so
 * a collision here means something is badly wrong rather than merely busy.
 */
export function fallbackUsername(random = Math.random): string {
  return `u${String(Math.floor(random() * 1e10)).padStart(10, '0')}`;
}

/**
 * The base on its own first (if it's valid as-is), then base + random
 * digits. Random rather than sequential so two people called "Jane" can't
 * guess each other's suffix, and so retries don't all collide on `jane1`.
 */
export function usernameCandidates(base: string, count: number, random = Math.random): string[] {
  const candidates = isValidUsername(base) ? [base] : [];
  while (candidates.length < count) {
    const suffix = String(Math.floor(random() * 10_000)).padStart(4, '0');
    candidates.push(`${base}${suffix}`);
  }
  return candidates;
}
