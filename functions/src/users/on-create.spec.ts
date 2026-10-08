import { beforeEach, describe, expect, it, vi } from 'vitest';

const { setMock, getAllMock, docMock, runTransactionMock, takenUsernames } = vi.hoisted(() => {
  const takenUsernames = new Set<string>();
  const docMock = vi.fn((path: string) => ({ path }));
  const getAllMock = vi.fn(async (...refs: { path: string }[]) =>
    refs.map((ref) => ({ exists: takenUsernames.has(ref.path.replace('usernames/', '')) })),
  );
  const setMock = vi.fn();
  const runTransactionMock = vi.fn(async (run: (transaction: unknown) => Promise<unknown>) =>
    run({ getAll: getAllMock, set: setMock }),
  );
  return { setMock, getAllMock, docMock, runTransactionMock, takenUsernames };
});

vi.mock('../admin', () => ({
  firestore: { doc: docMock, runTransaction: runTransactionMock },
}));

import { handleUserCreate } from './on-create';
import type { UserRecord } from './on-create';

function userRecord(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    uid: 'uid-1',
    email: 'jane@example.com',
    displayName: null,
    photoURL: null,
    providerData: [{ providerId: 'password' } as UserRecord['providerData'][number]],
    ...overrides,
  } as UserRecord;
}

describe('handleUserCreate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    takenUsernames.clear();
  });

  function userDocWrite(): Record<string, unknown> {
    const call = setMock.mock.calls.find(([ref]) => ref.path === 'users/uid-1');
    return call?.[1];
  }

  it('creates users/{uid} with onboarded false and blank display name for a password signup', async () => {
    await handleUserCreate(userRecord());

    expect(userDocWrite()).toEqual(
      expect.objectContaining({
        email: 'jane@example.com',
        displayName: '',
        photoUrl: null,
        providerId: 'password',
        onboarded: false,
        profileCity: null,
        settings: { language: 'en' },
      }),
    );
  });

  it('pre-fills display name and photo from a Google signup', async () => {
    await handleUserCreate(
      userRecord({
        displayName: 'Jane Doe',
        photoURL: 'https://example.com/jane.jpg',
        providerData: [{ providerId: 'google.com' } as UserRecord['providerData'][number]],
      }),
    );

    expect(userDocWrite()).toEqual(
      expect.objectContaining({
        displayName: 'Jane Doe',
        photoUrl: 'https://example.com/jane.jpg',
        providerId: 'google.com',
        onboarded: false,
      }),
    );
  });

  it('falls back to the password provider id when providerData is empty', async () => {
    await handleUserCreate(userRecord({ providerData: [] }));

    expect(userDocWrite()).toEqual(expect.objectContaining({ providerId: 'password' }));
  });

  it('assigns the email-derived handle and reserves it in the usernames index', async () => {
    await handleUserCreate(userRecord());

    expect(userDocWrite()).toEqual(expect.objectContaining({ username: 'jane' }));
    expect(setMock).toHaveBeenCalledWith(
      { path: 'usernames/jane' },
      expect.objectContaining({ uid: 'uid-1' }),
    );
  });

  it('derives the handle from the Google display name', async () => {
    await handleUserCreate(userRecord({ displayName: 'José Pérez' }));

    expect(userDocWrite()).toEqual(expect.objectContaining({ username: 'jose.perez' }));
  });

  it('falls back to a numeric suffix when the base handle is taken', async () => {
    takenUsernames.add('jane');

    await handleUserCreate(userRecord());

    expect(userDocWrite()?.['username']).toMatch(/^jane\d{4}$/);
  });

  it('falls back to a long random handle when every readable candidate is taken', async () => {
    getAllMock.mockImplementationOnce(async (...refs: unknown[]) =>
      refs.map((_ref, index) => ({ exists: index < refs.length - 1 })),
    );

    await handleUserCreate(userRecord());

    expect(userDocWrite()?.['username']).toMatch(/^u\d{10}$/);
  });

  it('creates no profile at all when not even the fallback handle is free', async () => {
    getAllMock.mockImplementationOnce(async (...refs: unknown[]) =>
      refs.map(() => ({ exists: true })),
    );

    await expect(handleUserCreate(userRecord())).rejects.toThrow('No free username');

    expect(userDocWrite()).toBeUndefined();
  });
});
