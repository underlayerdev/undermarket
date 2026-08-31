import { TestBed } from '@angular/core/testing';
import * as firestoreModule from 'firebase/firestore';
import { FirestoreListingRepository } from './firestore-listing.repository';
import { FIREBASE_FIRESTORE } from '../../../core/configuration/tokens';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  collection: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  getDocs: vi.fn(),
  orderBy: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  Timestamp: { now: vi.fn(() => ({ toDate: () => new Date('2026-01-01') })) },
}));

const baseDocData = {
  ownerId: 'owner-1',
  title: 'Vintage lamp',
  description: 'A nice lamp',
  price: 42,
  currency: 'USD',
  category: 'Furniture',
  imageUrls: [],
  status: 'active',
  createdAt: { toDate: () => new Date('2026-01-01') },
  updatedAt: { toDate: () => new Date('2026-01-01') },
};

describe('FirestoreListingRepository', () => {
  function createRepository(): FirestoreListingRepository {
    TestBed.configureTestingModule({
      providers: [{ provide: FIREBASE_FIRESTORE, useValue: {} }],
    });
    return TestBed.inject(FirestoreListingRepository);
  }

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should not include sourceProvider/sourceId on a listing that predates those fields', async () => {
    vi.mocked(firestoreModule.getDoc).mockResolvedValue({
      exists: () => true,
      data: () => baseDocData,
    } as never);
    const repository = createRepository();

    const listing = await repository.getById('123');

    expect(listing).not.toBeNull();
    expect('sourceProvider' in listing!).toBe(false);
    expect('sourceId' in listing!).toBe(false);
  });

  it('should include sourceProvider/sourceId when present on the document', async () => {
    vi.mocked(firestoreModule.getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ ...baseDocData, sourceProvider: 'mercadolibre', sourceId: 'MLA123' }),
    } as never);
    const repository = createRepository();

    const listing = await repository.getById('123');

    expect(listing?.sourceProvider).toBe('mercadolibre');
    expect(listing?.sourceId).toBe('MLA123');
  });

  // Regression: mapDoc used to always set these keys (to undefined when
  // absent), and update() spreads the mapped listing straight into
  // updateDoc() — which throws on a literal undefined field value. Every
  // listing that predates this feature would have broken on its next edit.
  it('should update a pre-existing listing without writing literal undefined fields', async () => {
    vi.mocked(firestoreModule.getDoc).mockResolvedValue({
      exists: () => true,
      data: () => baseDocData,
    } as never);
    const repository = createRepository();
    const listing = await repository.getById('123');

    await repository.update(listing!);

    const [, payload] = vi.mocked(firestoreModule.updateDoc).mock.calls[0];
    expect(payload).not.toHaveProperty('sourceProvider');
    expect(payload).not.toHaveProperty('sourceId');
  });
});
