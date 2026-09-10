import { describe, expect, it } from 'vitest';
import { filterListingsByQuery, sortListings } from './listing-query.util';
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

describe('filterListingsByQuery', () => {
  it('returns every listing when the query is empty', () => {
    const listings = [listing({ id: 'a' }), listing({ id: 'b' })];
    expect(filterListingsByQuery(listings, '')).toEqual(listings);
    expect(filterListingsByQuery(listings, undefined)).toEqual(listings);
  });

  it('matches case-insensitively against the title', () => {
    const listings = [
      listing({ id: 'a', title: 'Vintage lamp' }),
      listing({ id: 'b', title: 'Mountain bike' }),
    ];
    expect(filterListingsByQuery(listings, 'LAMP').map((l) => l.id)).toEqual(['a']);
  });

  it('matches against the description too', () => {
    const listings = [
      listing({ id: 'a', title: 'Chair', description: 'Solid oak, barely used.' }),
      listing({ id: 'b', title: 'Table', description: 'Glass top.' }),
    ];
    expect(filterListingsByQuery(listings, 'oak').map((l) => l.id)).toEqual(['a']);
  });
});

describe('sortListings', () => {
  it('defaults to newest first', () => {
    const listings = [
      listing({ id: 'older', createdAt: new Date('2026-01-01') }),
      listing({ id: 'newer', createdAt: new Date('2026-06-01') }),
    ];
    expect(sortListings(listings).map((l) => l.id)).toEqual(['newer', 'older']);
    expect(sortListings(listings, null).map((l) => l.id)).toEqual(['newer', 'older']);
  });

  it('sorts oldest first', () => {
    const listings = [
      listing({ id: 'newer', createdAt: new Date('2026-06-01') }),
      listing({ id: 'older', createdAt: new Date('2026-01-01') }),
    ];
    expect(sortListings(listings, 'oldest').map((l) => l.id)).toEqual(['older', 'newer']);
  });

  it('sorts by title A-Z', () => {
    const listings = [
      listing({ id: 'b', title: 'Zebra print scarf' }),
      listing({ id: 'a', title: 'Antique clock' }),
    ];
    expect(sortListings(listings, 'title-asc').map((l) => l.id)).toEqual(['a', 'b']);
  });

  it('does not mutate the input array', () => {
    const listings = [
      listing({ id: 'newer', createdAt: new Date('2026-06-01') }),
      listing({ id: 'older', createdAt: new Date('2026-01-01') }),
    ];
    sortListings(listings, 'oldest');
    expect(listings.map((l) => l.id)).toEqual(['newer', 'older']);
  });
});
