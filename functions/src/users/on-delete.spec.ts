import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMock, whereMock, batchDeleteMock, commitMock, collectionMock, batchMock } = vi.hoisted(
  () => {
    const getMock = vi.fn();
    const whereMock = vi.fn(() => ({ get: getMock }));
    const collectionMock = vi.fn(() => ({ where: whereMock }));
    const batchDeleteMock = vi.fn();
    const commitMock = vi.fn().mockResolvedValue(undefined);
    const batchMock = vi.fn(() => ({ delete: batchDeleteMock, commit: commitMock }));
    return { getMock, whereMock, batchDeleteMock, commitMock, collectionMock, batchMock };
  },
);

vi.mock('../admin', () => ({ firestore: { collection: collectionMock, batch: batchMock } }));

import { handleUserDeleted } from './on-delete';

describe('handleUserDeleted', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes every usernames entry pointing at the deleted user, including locked ones', async () => {
    getMock.mockResolvedValue({
      empty: false,
      docs: [{ ref: 'usernames/jane.doe' }, { ref: 'usernames/jane1234' }],
    });

    await handleUserDeleted('uid-1');

    expect(collectionMock).toHaveBeenCalledWith('usernames');
    expect(whereMock).toHaveBeenCalledWith('uid', '==', 'uid-1');
    expect(batchDeleteMock).toHaveBeenCalledWith('usernames/jane.doe');
    expect(batchDeleteMock).toHaveBeenCalledWith('usernames/jane1234');
    expect(commitMock).toHaveBeenCalled();
  });

  it('does nothing when the user held no handles', async () => {
    getMock.mockResolvedValue({ empty: true, docs: [] });

    await handleUserDeleted('uid-1');

    expect(batchMock).not.toHaveBeenCalled();
  });
});
