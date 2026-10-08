import { beforeEach, describe, expect, it, vi } from 'vitest';

const { docs, setMock, updateMock, docMock, runTransactionMock } = vi.hoisted(() => {
  const docs = new Map<string, Record<string, unknown>>();
  const docMock = vi.fn((path: string) => ({ path }));
  const setMock = vi.fn();
  const updateMock = vi.fn();
  const runTransactionMock = vi.fn(async (run: (transaction: unknown) => Promise<unknown>) =>
    run({
      get: async (ref: { path: string }) => ({
        exists: docs.has(ref.path),
        data: () => docs.get(ref.path),
      }),
      set: setMock,
      update: updateMock,
    }),
  );
  return { docs, setMock, updateMock, docMock, runTransactionMock };
});

vi.mock('../admin', () => ({
  firestore: { doc: docMock, runTransaction: runTransactionMock },
}));

import { handleClaimUsername } from './claim-username';

const NOW = new Date('2026-10-08T12:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

describe('handleClaimUsername', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    docs.clear();
    docs.set('users/uid-1', { username: 'jane1234' });
  });

  it('claims a free handle, locks the old one and records the change time', async () => {
    const result = await handleClaimUsername('uid-1', '@Jane.Doe', NOW);

    expect(result).toEqual({ username: 'jane.doe', usernameChangedAt: NOW.getTime() });
    expect(setMock).toHaveBeenCalledWith(
      { path: 'usernames/jane.doe' },
      { uid: 'uid-1', createdAt: NOW },
    );
    expect(setMock).toHaveBeenCalledWith(
      { path: 'usernames/jane1234' },
      { lockedUntil: new Date(NOW.getTime() + 14 * DAY_MS) },
      { merge: true },
    );
    expect(updateMock).toHaveBeenCalledWith(
      { path: 'users/uid-1' },
      { username: 'jane.doe', usernameChangedAt: NOW },
    );
  });

  it('rejects a handle another user holds', async () => {
    docs.set('usernames/jane.doe', { uid: 'uid-2', createdAt: NOW });

    await expect(handleClaimUsername('uid-1', 'jane.doe', NOW)).rejects.toMatchObject({
      code: 'already-exists',
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects another user's released handle while it is still locked", async () => {
    docs.set('usernames/jane.doe', {
      uid: 'uid-2',
      createdAt: NOW,
      lockedUntil: new Date(NOW.getTime() + DAY_MS),
    });

    await expect(handleClaimUsername('uid-1', 'jane.doe', NOW)).rejects.toMatchObject({
      code: 'already-exists',
    });
  });

  it('rejects a change inside the 30-day cooldown', async () => {
    docs.set('users/uid-1', {
      username: 'jane1234',
      usernameChangedAt: new Date(NOW.getTime() - 10 * DAY_MS),
    });

    await expect(handleClaimUsername('uid-1', 'jane.doe', NOW)).rejects.toMatchObject({
      code: 'failed-precondition',
    });
  });

  it('allows a change once the cooldown has passed', async () => {
    docs.set('users/uid-1', {
      username: 'jane1234',
      usernameChangedAt: new Date(NOW.getTime() - 31 * DAY_MS),
    });

    await expect(handleClaimUsername('uid-1', 'jane.doe', NOW)).resolves.toMatchObject({
      username: 'jane.doe',
    });
  });

  it('is a no-op when the handle is already the current one', async () => {
    await handleClaimUsername('uid-1', 'jane1234', NOW);

    expect(setMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it.each([['ab'], ['settings'], ['jane..doe'], [42]])(
    'rejects an invalid or reserved handle (%s) without opening a transaction',
    async (username) => {
      await expect(handleClaimUsername('uid-1', username, NOW)).rejects.toMatchObject({
        code: 'invalid-argument',
      });
      expect(runTransactionMock).not.toHaveBeenCalled();
    },
  );

  it('rejects when the profile does not exist', async () => {
    docs.clear();

    await expect(handleClaimUsername('uid-1', 'jane.doe', NOW)).rejects.toMatchObject({
      code: 'not-found',
    });
  });
});
