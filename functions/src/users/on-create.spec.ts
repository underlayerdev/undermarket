import { beforeEach, describe, expect, it, vi } from 'vitest';

const { setMock, docMock } = vi.hoisted(() => {
  const setMock = vi.fn().mockResolvedValue(undefined);
  const docMock = vi.fn(() => ({ set: setMock }));
  return { setMock, docMock };
});

vi.mock('../admin', () => ({ firestore: { doc: docMock } }));

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
  });

  it('creates users/{uid} with onboarded false and blank display name for a password signup', async () => {
    await handleUserCreate(userRecord());

    expect(docMock).toHaveBeenCalledWith('users/uid-1');
    expect(setMock).toHaveBeenCalledWith(
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

    expect(setMock).toHaveBeenCalledWith(
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

    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ providerId: 'password' }));
  });
});
