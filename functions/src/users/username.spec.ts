import { describe, expect, it } from 'vitest';
import {
  cooldownEndsAt,
  fallbackUsername,
  isClaimable,
  isValidUsername,
  normalizeUsername,
  releaseLockUntil,
  usernameBase,
  usernameCandidates,
} from './username';

const NOW = new Date('2026-10-08T12:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

describe('normalizeUsername', () => {
  it('trims, strips a leading @ and lowercases', () => {
    expect(normalizeUsername('  @Jane.Doe ')).toBe('jane.doe');
  });
});

describe('isValidUsername', () => {
  it.each(['jane', 'jane.doe', 'jane_doe', 'j4ne', 'abc', 'a'.repeat(20)])('accepts %s', (name) => {
    expect(isValidUsername(name)).toBe(true);
  });

  it.each([
    ['too short', 'ab'],
    ['too long', 'a'.repeat(21)],
    ['uppercase', 'Jane'],
    ['leading dot', '.jane'],
    ['trailing underscore', 'jane_'],
    ['doubled separator', 'jane..doe'],
    ['mixed doubled separator', 'jane._doe'],
    ['hyphen', 'jane-doe'],
    ['non-ASCII lookalike', 'jаne'],
    ['all digits', '12345'],
    ['reserved route', 'settings'],
    ['reserved brand', 'undermarket'],
  ])('rejects %s', (_label, name) => {
    expect(isValidUsername(name)).toBe(false);
  });
});

describe('isClaimable', () => {
  it('allows a free handle', () => {
    expect(isClaimable(undefined, 'uid-1', NOW)).toBe(true);
  });

  it("allows reclaiming the caller's own handle", () => {
    expect(isClaimable({ uid: 'uid-1', createdAt: NOW, lockedUntil: NOW }, 'uid-1', NOW)).toBe(
      true,
    );
  });

  it("rejects another user's active handle", () => {
    expect(isClaimable({ uid: 'uid-2', createdAt: NOW }, 'uid-1', NOW)).toBe(false);
  });

  it('rejects a released handle while it is still locked', () => {
    const lockedUntil = new Date(NOW.getTime() + DAY_MS);
    expect(isClaimable({ uid: 'uid-2', createdAt: NOW, lockedUntil }, 'uid-1', NOW)).toBe(false);
  });

  it('allows a released handle once the lock expired', () => {
    const lockedUntil = new Date(NOW.getTime() - 1);
    expect(isClaimable({ uid: 'uid-2', createdAt: NOW, lockedUntil }, 'uid-1', NOW)).toBe(true);
  });
});

describe('release lock and cooldown', () => {
  it('locks a released handle for 14 days', () => {
    expect(releaseLockUntil(NOW).getTime() - NOW.getTime()).toBe(14 * DAY_MS);
  });

  it('allows the next change 30 days after the last one', () => {
    expect(cooldownEndsAt(NOW).getTime() - NOW.getTime()).toBe(30 * DAY_MS);
  });
});

describe('usernameBase', () => {
  it('turns a display name into a dotted handle and folds accents', () => {
    expect(usernameBase('José  Pérez', 'x@example.com')).toBe('jose.perez');
  });

  it('falls back to the email local part when there is no display name', () => {
    expect(usernameBase(null, 'jane_doe+shop@example.com')).toBe('jane_doeshop');
  });

  it('falls back to "user" when nothing usable is left', () => {
    expect(usernameBase('李雷', null)).toBe('user');
  });

  it('falls back to "user" for an all-digits base', () => {
    expect(usernameBase(null, '12345@example.com')).toBe('user');
  });

  it('leaves room for a 4-digit suffix within the max length', () => {
    expect(usernameBase('a'.repeat(40), null).length + 4).toBeLessThanOrEqual(20);
  });
});

describe('usernameCandidates', () => {
  it('tries the bare base first, then suffixed variants', () => {
    const candidates = usernameCandidates('jane', 3, () => 0.1234);
    expect(candidates).toEqual(['jane', 'jane1234', 'jane1234']);
  });

  it('skips the bare base when it is not valid on its own', () => {
    const candidates = usernameCandidates('shop', 2, () => 0.5);
    expect(candidates).toEqual(['shop5000', 'shop5000']);
  });
});

describe('fallbackUsername', () => {
  it('is always a valid handle, even when the random source returns 0', () => {
    expect(isValidUsername(fallbackUsername(() => 0))).toBe(true);
    expect(isValidUsername(fallbackUsername())).toBe(true);
  });
});
