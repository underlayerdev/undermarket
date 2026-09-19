import { beforeEach, describe, expect, it, vi } from 'vitest';

const { updateMock, docMock } = vi.hoisted(() => {
  const updateMock = vi.fn().mockResolvedValue(undefined);
  const docMock = vi.fn(() => ({ update: updateMock }));
  return { updateMock, docMock };
});

vi.mock('../admin', () => ({ firestore: { doc: docMock } }));

import { handleUserProfileUpdate } from './on-update';

describe('handleUserProfileUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('flips onboarded to true once a not-yet-onboarded profile has a valid display name', async () => {
    await handleUserProfileUpdate({ onboarded: false, displayName: 'Jane Doe' }, 'uid-1');

    expect(docMock).toHaveBeenCalledWith('users/uid-1');
    expect(updateMock).toHaveBeenCalledWith({ onboarded: true });
  });

  it('does nothing when the profile is already onboarded', async () => {
    await handleUserProfileUpdate({ onboarded: true, displayName: 'Jane Doe' }, 'uid-1');

    expect(updateMock).not.toHaveBeenCalled();
  });

  it('does nothing while the display name is still blank', async () => {
    await handleUserProfileUpdate({ onboarded: false, displayName: '' }, 'uid-1');

    expect(updateMock).not.toHaveBeenCalled();
  });

  it('does nothing when the display name is under the minimum length', async () => {
    await handleUserProfileUpdate({ onboarded: false, displayName: 'a' }, 'uid-1');

    expect(updateMock).not.toHaveBeenCalled();
  });

  it('does nothing when the display name is over the maximum length', async () => {
    await handleUserProfileUpdate(
      { onboarded: false, displayName: 'a'.repeat(51) },
      'uid-1',
    );

    expect(updateMock).not.toHaveBeenCalled();
  });

  it('does nothing when onboarded is missing entirely', async () => {
    await handleUserProfileUpdate({ displayName: 'Jane Doe' }, 'uid-1');

    expect(updateMock).not.toHaveBeenCalled();
  });
});
