import { TestBed } from '@angular/core/testing';
import * as firestoreModule from 'firebase/firestore';
import { FirestoreSearchLocationRepository } from './firestore-search-location.repository';
import { FIREBASE_FIRESTORE } from '../../../core/configuration/tokens';
import type { SearchLocation } from '../../../domain/location/location.model';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  Timestamp: { now: vi.fn(() => ({ toDate: () => new Date('2026-01-01') })) },
}));

const searchLocation: SearchLocation = {
  displayName: 'Palermo, Buenos Aires',
  countryCode: 'AR',
  region: 'Buenos Aires',
  city: 'Buenos Aires',
  neighborhood: 'Palermo',
  latitude: -34.5875,
  longitude: -58.4205,
  geohash: '6ex2ug0d0',
  radiusKm: 10,
  source: 'saved',
  updatedAt: new Date('2026-01-01'),
};

describe('FirestoreSearchLocationRepository', () => {
  function createRepository(): FirestoreSearchLocationRepository {
    TestBed.configureTestingModule({
      providers: [{ provide: FIREBASE_FIRESTORE, useValue: {} }],
    });
    return TestBed.inject(FirestoreSearchLocationRepository);
  }

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when no doc exists for the user', async () => {
    vi.mocked(firestoreModule.getDoc).mockResolvedValue({ exists: () => false } as never);
    const repository = createRepository();

    expect(await repository.getByUser('user-1')).toBeNull();
  });

  it('should round-trip a saved location', async () => {
    vi.mocked(firestoreModule.getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({
        displayName: searchLocation.displayName,
        countryCode: searchLocation.countryCode,
        region: searchLocation.region,
        city: searchLocation.city,
        neighborhood: searchLocation.neighborhood,
        latitude: searchLocation.latitude,
        longitude: searchLocation.longitude,
        geohash: searchLocation.geohash,
        radiusKm: searchLocation.radiusKm,
        source: searchLocation.source,
        updatedAt: { toDate: () => searchLocation.updatedAt },
      }),
    } as never);
    const repository = createRepository();

    const result = await repository.getByUser('user-1');

    expect(result).toEqual(searchLocation);
  });

  it('should save via setDoc with merge, without writing the updatedAt Date directly', async () => {
    const repository = createRepository();

    await repository.save('user-1', searchLocation);

    const [, payload, options] = vi.mocked(firestoreModule.setDoc).mock.calls[0];
    expect(payload).not.toHaveProperty('updatedAt', searchLocation.updatedAt);
    expect(payload).toMatchObject({ displayName: searchLocation.displayName, radiusKm: 10 });
    expect(options).toEqual({ merge: true });
  });
});
