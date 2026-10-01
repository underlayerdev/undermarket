import { TestBed } from '@angular/core/testing';
import { CategoryService } from './category.service';
import { CATEGORY_NODE_REPOSITORY } from '../../core/configuration/tokens';
import type { CategoryNode } from '../../domain/category-node/category-node.model';

function node(overrides: Partial<CategoryNode> = {}): CategoryNode {
  return {
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
    ...overrides,
  };
}

describe('CategoryService', () => {
  let getAllMock: ReturnType<typeof vi.fn>;

  function createService(): CategoryService {
    getAllMock = vi.fn().mockResolvedValue([]);
    TestBed.configureTestingModule({
      providers: [{ provide: CATEGORY_NODE_REPOSITORY, useValue: { getAll: getAllMock } }],
    });
    return TestBed.inject(CategoryService);
  }

  it('should load the tree once and cache it in the signal', async () => {
    const service = createService();
    const categories = [node()];
    getAllMock.mockResolvedValue(categories);

    await service.ensureLoaded();
    await service.ensureLoaded();

    expect(getAllMock).toHaveBeenCalledTimes(1);
    expect(service.tree()).toEqual(categories);
  });

  it('should share a single in-flight request between concurrent callers', async () => {
    const service = createService();
    let resolveGetAll!: (categories: CategoryNode[]) => void;
    getAllMock.mockReturnValue(new Promise((resolve) => (resolveGetAll = resolve)));

    const first = service.ensureLoaded();
    const second = service.ensureLoaded();
    resolveGetAll([node()]);
    await Promise.all([first, second]);

    expect(getAllMock).toHaveBeenCalledTimes(1);
  });

  it('should expose active roots sorted by order', () => {
    const service = createService();
    service.tree.set([
      node({ categoryId: 'b', order: 1 }),
      node({ categoryId: 'a', order: 0 }),
      node({ categoryId: 'child', parentId: 'a', depth: 1, order: 0 }),
    ]);

    expect(service.roots().map((category) => category.categoryId)).toEqual(['a', 'b']);
  });

  it('should put featured roots before the rest, sorted by featuredOrder', () => {
    const service = createService();
    service.tree.set([
      node({ categoryId: 'c', order: 0 }),
      node({ categoryId: 'featured-2', order: 5, featured: true, featuredOrder: 2 }),
      node({ categoryId: 'b', order: 1 }),
      node({ categoryId: 'featured-1', order: 9, featured: true, featuredOrder: 1 }),
    ]);

    expect(service.roots().map((category) => category.categoryId)).toEqual([
      'featured-1',
      'featured-2',
      'c',
      'b',
    ]);
  });

  it('orderedTree should feature roots first, and leave each sibling group correctly ordered within itself', () => {
    const service = createService();
    service.tree.set([
      node({ categoryId: 'b', order: 1 }),
      node({ categoryId: 'featured', order: 9, featured: true, featuredOrder: 1 }),
      node({ categoryId: 'a', order: 0 }),
      node({ categoryId: 'a-child-2', parentId: 'a', depth: 1, order: 1 }),
      node({ categoryId: 'a-child-1', parentId: 'a', depth: 1, order: 0 }),
    ]);

    const tree = service.orderedTree();
    const rootIds = tree.filter((c) => c.parentId === null).map((c) => c.categoryId);
    const aChildIds = tree.filter((c) => c.parentId === 'a').map((c) => c.categoryId);

    expect(rootIds).toEqual(['featured', 'a', 'b']);
    expect(aChildIds).toEqual(['a-child-1', 'a-child-2']);
  });

  it('should return the children of a given parent, sorted by order', () => {
    const service = createService();
    service.tree.set([
      node({ categoryId: 'root' }),
      node({ categoryId: 'child-b', parentId: 'root', depth: 1, order: 1 }),
      node({ categoryId: 'child-a', parentId: 'root', depth: 1, order: 0 }),
    ]);

    expect(service.childrenOf('root').map((category) => category.categoryId)).toEqual([
      'child-a',
      'child-b',
    ]);
  });

  it('should resolve a breadcrumb from root to leaf', () => {
    const service = createService();
    service.tree.set([
      node({ categoryId: 'electronics', path: ['electronics'] }),
      node({
        categoryId: 'electronics-computing',
        parentId: 'electronics',
        depth: 1,
        path: ['electronics', 'electronics-computing'],
      }),
      node({
        categoryId: 'electronics-computing-laptops',
        parentId: 'electronics-computing',
        depth: 2,
        isLeaf: true,
        path: ['electronics', 'electronics-computing', 'electronics-computing-laptops'],
      }),
    ]);

    const breadcrumb = service.breadcrumbFor('electronics-computing-laptops');

    expect(breadcrumb.map((category) => category.categoryId)).toEqual([
      'electronics',
      'electronics-computing',
      'electronics-computing-laptops',
    ]);
  });

  it('should return an empty breadcrumb for an unknown categoryId', () => {
    const service = createService();
    expect(service.breadcrumbFor('missing')).toEqual([]);
  });

  it('should not require a condition for a node under the services root', () => {
    const service = createService();
    service.tree.set([
      node({ categoryId: 'services', path: ['services'] }),
      node({
        categoryId: 'services-home-services',
        parentId: 'services',
        depth: 1,
        isLeaf: true,
        path: ['services', 'services-home-services'],
      }),
    ]);

    expect(service.requiresCondition('services')).toBe(false);
    expect(service.requiresCondition('services-home-services')).toBe(false);
  });

  it('should require a condition for any other category, and default to true when unknown', () => {
    const service = createService();
    service.tree.set([node({ categoryId: 'electronics', path: ['electronics'] })]);

    expect(service.requiresCondition('electronics')).toBe(true);
    expect(service.requiresCondition('not-a-real-category')).toBe(true);
  });
});
