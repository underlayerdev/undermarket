import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FieldValue } from 'firebase-admin/firestore';
import { seedCategories } from './seed-categories';
import type { CategoryNodeInput } from './category-node';

const { docMock, whereMock, collectionMock } = vi.hoisted(() => {
  const docMock = vi.fn();
  const whereMock = vi.fn();
  const collectionMock = vi.fn(() => ({ doc: docMock, where: whereMock }));
  return { docMock, whereMock, collectionMock };
});

vi.mock('../admin', () => ({ firestore: { collection: collectionMock } }));

function node(overrides: Partial<CategoryNodeInput> = {}): CategoryNodeInput {
  return {
    categoryId: 'electronics',
    parentId: null,
    path: ['electronics'],
    depth: 0,
    order: 0,
    icon: 'shopping_bag',
    isActive: true,
    isLeaf: true,
    featured: false,
    featuredOrder: 0,
    updatedBy: 'test',
    ...overrides,
  };
}

function writeSeedFile(nodes: CategoryNodeInput[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'categories-seed-'));
  const filePath = join(dir, 'seed.json');
  writeFileSync(filePath, JSON.stringify(nodes));
  return filePath;
}

describe('seedCategories', () => {
  let setSpy: ReturnType<typeof vi.fn>;
  let getSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    setSpy = vi.fn().mockResolvedValue(undefined);
    getSpy = vi.fn();
    docMock.mockImplementation(() => ({ get: getSpy, set: setSpy }));
    whereMock.mockReturnValue({ get: vi.fn().mockResolvedValue({ docs: [] }) });
  });

  it('should set createdAt and updatedAt when creating a new node', async () => {
    getSpy.mockResolvedValue({ exists: false });
    const filePath = writeSeedFile([node()]);

    await seedCategories(filePath);

    expect(setSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryId: 'electronics',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      }),
      { merge: true },
    );
  });

  it('should not overwrite createdAt when re-seeding a node that already exists', async () => {
    getSpy.mockResolvedValue({ exists: true });
    const filePath = writeSeedFile([node()]);

    await seedCategories(filePath);

    const [payload] = setSpy.mock.calls[0] as [Record<string, unknown>, unknown];
    expect(payload).not.toHaveProperty('createdAt');
    expect(payload['updatedAt']).toBeInstanceOf(Date);
  });

  it('should soft-deactivate a category present in Firestore but missing from the new file', async () => {
    getSpy.mockResolvedValue({ exists: true });
    const staleSetSpy = vi.fn().mockResolvedValue(undefined);
    whereMock.mockReturnValue({
      get: vi.fn().mockResolvedValue({
        docs: [{ id: 'discontinued', ref: { set: staleSetSpy } }],
      }),
    });
    const filePath = writeSeedFile([node()]);

    await seedCategories(filePath);

    expect(staleSetSpy).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }), {
      merge: true,
    });
  });

  it('should delete a stale icon field when re-seeding a node that no longer sets one', async () => {
    getSpy.mockResolvedValue({ exists: true });
    const filePath = writeSeedFile([node({ depth: 1, parentId: 'electronics', icon: undefined })]);

    await seedCategories(filePath);

    const [payload] = setSpy.mock.calls[0] as [Record<string, unknown>, unknown];
    expect(payload['icon']).toEqual(FieldValue.delete());
  });

  it('should not touch a category that is present in both Firestore and the new file', async () => {
    getSpy.mockResolvedValue({ exists: true });
    const keptSetSpy = vi.fn().mockResolvedValue(undefined);
    whereMock.mockReturnValue({
      get: vi.fn().mockResolvedValue({
        docs: [{ id: 'electronics', ref: { set: keptSetSpy } }],
      }),
    });
    const filePath = writeSeedFile([node()]);

    await seedCategories(filePath);

    expect(keptSetSpy).not.toHaveBeenCalled();
  });
});
