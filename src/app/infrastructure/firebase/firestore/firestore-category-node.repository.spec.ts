import { TestBed } from '@angular/core/testing';
import * as firestoreModule from 'firebase/firestore';
import { FirestoreCategoryNodeRepository } from './firestore-category-node.repository';
import { FIREBASE_FIRESTORE } from '../../../core/configuration/tokens';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  getDocs: vi.fn(),
  where: vi.fn(),
}));

function categoryDoc(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    data: () => ({
      parentId: null,
      path: [id],
      depth: 0,
      order: 0,
      icon: 'shopping_bag',
      isActive: true,
      isLeaf: false,
      createdAt: { toDate: () => new Date('2026-01-01') },
      updatedAt: { toDate: () => new Date('2026-01-01') },
      updatedBy: 'seed-script',
      ...overrides,
    }),
  };
}

describe('FirestoreCategoryNodeRepository', () => {
  function createRepository(): FirestoreCategoryNodeRepository {
    TestBed.configureTestingModule({
      providers: [{ provide: FIREBASE_FIRESTORE, useValue: {} }],
    });
    return TestBed.inject(FirestoreCategoryNodeRepository);
  }

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should query only active categories', async () => {
    vi.mocked(firestoreModule.getDocs).mockResolvedValue({
      docs: [categoryDoc('electronics')],
    } as never);
    const repository = createRepository();

    await repository.getAll();

    expect(firestoreModule.where).toHaveBeenCalledWith('isActive', '==', true);
  });

  it('should map every field of a category doc', async () => {
    vi.mocked(firestoreModule.getDocs).mockResolvedValue({
      docs: [categoryDoc('electronics', { icon: 'computer' })],
    } as never);
    const repository = createRepository();

    const [category] = await repository.getAll();

    expect(category).toEqual({
      categoryId: 'electronics',
      parentId: null,
      path: ['electronics'],
      depth: 0,
      order: 0,
      icon: 'computer',
      isActive: true,
      isLeaf: false,
      featured: false,
      featuredOrder: 0,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      updatedBy: 'seed-script',
    });
  });
});
