import { describe, expect, it } from 'vitest';
import { sortListingsByDistance } from './listing-distance.util';
import type { Listing } from './listing.model';

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 'listing-1',
    ownerId: 'user-1',
    title: 'A nice chair',
    description: 'A nice chair, barely used.',
    price: 1000,
    currency: 'USD',
    category: 'Furniture',
    imageUrls: [],
    status: 'active',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

const origin = { latitude: -34.6037, longitude: -58.3816 }; // Buenos Aires downtown

describe('sortListingsByDistance', () => {
  it('sorts ascending by distance from the origin', () => {
    const far = listing({
      id: 'far',
      location: {
        displayName: 'Rosario',
        countryCode: 'AR',
        region: 'Santa Fe',
        city: 'Rosario',
        latitude: -32.9468,
        longitude: -60.6393,
        geohash: '',
      },
    });
    const near = listing({
      id: 'near',
      location: {
        displayName: 'Palermo, Buenos Aires',
        countryCode: 'AR',
        region: 'Buenos Aires',
        city: 'Buenos Aires',
        neighborhood: 'Palermo',
        latitude: -34.5875,
        longitude: -58.4205,
        geohash: '',
      },
    });

    expect(sortListingsByDistance([far, near], origin).map((l) => l.id)).toEqual(['near', 'far']);
  });

  it('drops listings with no location', () => {
    const withLocation = listing({
      id: 'has-location',
      location: {
        displayName: 'Palermo, Buenos Aires',
        countryCode: 'AR',
        region: 'Buenos Aires',
        city: 'Buenos Aires',
        latitude: -34.5875,
        longitude: -58.4205,
        geohash: '',
      },
    });
    const withoutLocation = listing({ id: 'no-location' });

    expect(
      sortListingsByDistance([withLocation, withoutLocation], origin).map((l) => l.id),
    ).toEqual(['has-location']);
  });

  it('does not mutate the input array', () => {
    const listings = [listing({ id: 'a' }), listing({ id: 'b' })];
    sortListingsByDistance(listings, origin);
    expect(listings.map((l) => l.id)).toEqual(['a', 'b']);
  });
});
