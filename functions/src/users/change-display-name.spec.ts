import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMock, updateMock, docMock } = vi.hoisted(() => {
  const getMock = vi.fn();
  const updateMock = vi.fn().mockResolvedValue(undefined);
  const docMock = vi.fn(() => ({ get: getMock, update: updateMock }));
  return { getMock, updateMock, docMock };
});

vi.mock('../admin', () => ({ firestore: { doc: docMock } }));

import { handleChangeDisplayName } from './change-display-name';

describe('handleChangeDisplayName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMock.mockResolvedValue({ exists: true });
  });

  it('stores the normalized name and returns it', async () => {
    const result = await handleChangeDisplayName('uid-1', '  José   María ');

    expect(result).toEqual({ displayName: 'José María' });
    expect(docMock).toHaveBeenCalledWith('users/uid-1');
    expect(updateMock).toHaveBeenCalledWith({ displayName: 'José María' });
  });

  it('folds fancy letters instead of storing them', async () => {
    const result = await handleChangeDisplayName('uid-1', '𝓛𝓾𝓬𝓪𝓼');

    expect(result.displayName).toBe('Lucas');
  });

  it.each([
    ['Jane 😀', 'invalidCharacters'],
    ['pаypal', 'mixedScripts'],
    ['Jaaaane', 'repeatedCharacters'],
    ['mary.smith', 'looksLikeLink'],
    ['Maria 600 123 456', 'tooManyDigits'],
    ['Undermarket Support', 'reserved'],
    ['J', 'tooShort'],
    ['   ', 'required'],
  ])('rejects %s (%s) without writing anything', async (name, reason) => {
    await expect(handleChangeDisplayName('uid-1', name)).rejects.toMatchObject({
      code: 'invalid-argument',
      details: { reason },
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('rejects a value that is not a string', async () => {
    await expect(handleChangeDisplayName('uid-1', 42)).rejects.toMatchObject({
      code: 'invalid-argument',
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('rejects when the profile does not exist', async () => {
    getMock.mockResolvedValue({ exists: false });

    await expect(handleChangeDisplayName('uid-1', 'Jane Doe')).rejects.toMatchObject({
      code: 'not-found',
    });
    expect(updateMock).not.toHaveBeenCalled();
  });
});
