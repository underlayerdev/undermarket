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
    expect(payload).not.toHaveProperty('geohash');
  });

  const testLocation = {
    displayName: 'Palermo, Buenos Aires',
    countryCode: 'AR',
    region: 'Buenos Aires',
    city: 'Buenos Aires',
    neighborhood: 'Palermo',
    latitude: -34.5875,
    longitude: -58.4205,
    geohash: '6ex2ug0d0',
  };

  it('should not include location on a listing that predates that field', async () => {
    vi.mocked(firestoreModule.getDoc).mockResolvedValue({
      exists: () => true,
      data: () => baseDocData,
    } as never);
    const repository = createRepository();

    const listing = await repository.getById('123');

    expect('location' in listing!).toBe(false);
  });

  it('should round-trip location, and flatten geohash at the top level on write', async () => {
    vi.mocked(firestoreModule.getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ ...baseDocData, location: testLocation }),
    } as never);
    const repository = createRepository();
    const listing = await repository.getById('123');
    expect(listing?.location).toEqual(testLocation);

    await repository.update(listing!);

    const [, payload] = vi.mocked(firestoreModule.updateDoc).mock.calls[0];
    expect(payload).toMatchObject({ location: testLocation, geohash: testLocation.geohash });
  });

  it('should flatten geohash at the top level when creating a listing with a location', async () => {
    vi.mocked(firestoreModule.addDoc).mockResolvedValue({ id: 'new-id' } as never);
    const repository = createRepository();

    await repository.create({
      ownerId: 'owner-1',
      title: 'Vintage lamp',
      description: 'A nice lamp',
      price: 42,
      currency: 'USD',
      category: 'Furniture',
      imageUrls: [],
      status: 'active',
      location: testLocation,
    });

    const [, payload] = vi.mocked(firestoreModule.addDoc).mock.calls[0];
    expect(payload).toMatchObject({ location: testLocation, geohash: testLocation.geohash });
  });

  describe('searchNearby', () => {
    function docSnapshot(id: string, data: Record<string, unknown>) {
      return { id, data: () => data };
    }

    it('should query once per geohash bounding box, dedupe overlapping ids, and apply the radius filter', async () => {
      const near = docSnapshot('near', { ...baseDocData, location: testLocation });
      const far = docSnapshot('far', {
        ...baseDocData,
        location: {
          ...testLocation,
          displayName: 'Rosario',
          city: 'Rosario',
          latitude: -32.9468,
          longitude: -60.6393,
        },
      });
      // The same doc can appear in more than one bounding-box query — the
      // repository must dedupe rather than double-count it.
      vi.mocked(firestoreModule.getDocs).mockResolvedValue({ docs: [near, far] } as never);
      const repository = createRepository();

      const result = await repository.searchNearby({
        center: { latitude: testLocation.latitude, longitude: testLocation.longitude },
        radiusKm: 10,
      });

      expect(result.map((l) => l.id)).toEqual(['near']);
      // geohashQueryBoundsForRadius returns more than one bound for most
      // radii — every one of them should have run as its own query.
      expect(vi.mocked(firestoreModule.getDocs).mock.calls.length).toBeGreaterThan(1);
    });

    it('should exclude listings with no location at all', async () => {
      const noLocation = docSnapshot('no-location', baseDocData);
      vi.mocked(firestoreModule.getDocs).mockResolvedValue({ docs: [noLocation] } as never);
      const repository = createRepository();

      const result = await repository.searchNearby({
        center: { latitude: testLocation.latitude, longitude: testLocation.longitude },
        radiusKm: 10,
      });

      expect(result).toEqual([]);
    });

    it('should apply the category filter client-side after the radius filter', async () => {
      const furniture = docSnapshot('furniture', { ...baseDocData, location: testLocation });
      const electronics = docSnapshot('electronics', {
        ...baseDocData,
        category: 'Electronics',
        location: testLocation,
      });
      vi.mocked(firestoreModule.getDocs).mockResolvedValue({
        docs: [furniture, electronics],
      } as never);
      const repository = createRepository();

      const result = await repository.searchNearby({
        center: { latitude: testLocation.latitude, longitude: testLocation.longitude },
        radiusKm: 10,
        category: 'Electronics',
      });

      expect(result.map((l) => l.id)).toEqual(['electronics']);
    });
  });

  describe('getPublicByOwner', () => {
    it('should query by owner and active status, mapping the results', async () => {
      vi.mocked(firestoreModule.getDocs).mockResolvedValue({
        docs: [{ id: 'a', data: () => baseDocData }],
      } as never);
      const repository = createRepository();

      const result = await repository.getPublicByOwner('owner-1');

      expect(result.map((l) => l.id)).toEqual(['a']);
      expect(vi.mocked(firestoreModule.where)).toHaveBeenCalledWith('ownerId', '==', 'owner-1');
      expect(vi.mocked(firestoreModule.where)).toHaveBeenCalledWith('status', '==', 'active');
    });
  });
});
