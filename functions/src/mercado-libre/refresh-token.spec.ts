import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getValidAccessToken } from './refresh-token';

const { getMock, updateMock, docMock, collectionMock } = vi.hoisted(() => {
  const getMock = vi.fn();
  const updateMock = vi.fn().mockResolvedValue(undefined);
  const docMock = vi.fn(() => ({ get: getMock, update: updateMock }));
  const collectionMock = vi.fn(() => ({ doc: docMock }));
  return { getMock, updateMock, docMock, collectionMock };
});

vi.mock('../admin', () => ({ firestore: { collection: collectionMock } }));

function timestamp(ms: number): { toMillis(): number } {
  return { toMillis: () => ms };
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

describe('getValidAccessToken', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('should return null when there is no connection', async () => {
    getMock.mockResolvedValue({ exists: false });

    expect(await getValidAccessToken('uid-1')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should return the stored token without refreshing when it is still valid', async () => {
    getMock.mockResolvedValue({
      exists: true,
      data: () => ({
        accessToken: 'valid-token',
        refreshToken: 'refresh',
        mlUserId: 42,
        expiresAt: timestamp(Date.now() + 60 * 60 * 1000),
      }),
    });

    const result = await getValidAccessToken('uid-1');

    expect(result).toEqual({ accessToken: 'valid-token', mlUserId: 42 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should refresh, persist the rotated refresh token, and return the new access token when expired', async () => {
    getMock.mockResolvedValue({
      exists: true,
      data: () => ({
        accessToken: 'old-token',
        refreshToken: 'old-refresh',
        mlUserId: 42,
        expiresAt: timestamp(Date.now() - 1000),
      }),
    });
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        access_token: 'new-token',
        refresh_token: 'new-refresh',
        expires_in: 21600,
        user_id: 42,
      }),
    );

    const result = await getValidAccessToken('uid-1');

    expect(result).toEqual({ accessToken: 'new-token', mlUserId: 42 });
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'new-token', refreshToken: 'new-refresh' }),
    );
  });

  it('should throw when the refresh request fails', async () => {
    getMock.mockResolvedValue({
      exists: true,
      data: () => ({
        accessToken: 'old-token',
        refreshToken: 'old-refresh',
        mlUserId: 42,
        expiresAt: timestamp(Date.now() - 1000),
      }),
    });
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, false, 400));

    await expect(getValidAccessToken('uid-1')).rejects.toThrow('reconnecting is required');
  });
});
