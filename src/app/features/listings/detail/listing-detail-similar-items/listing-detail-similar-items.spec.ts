import { TestBed } from '@angular/core/testing';
import { getTranslocoTestingModule } from '../../../../../testing/transloco-testing';
import { ListingDetailSimilarItems } from './listing-detail-similar-items';
import { LISTING_REPOSITORY } from '../../../../core/configuration/tokens';
import type { Listing } from '../../../../domain/listing/listing.model';

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 'target',
    ownerId: 'owner-1',
    title: 'A nice chair',
    description: 'A nice chair, barely used.',
    price: 1000,
    currency: 'USD',
    categoryId: 'electronics-cameras-drones',
    categoryPath: ['electronics', 'electronics-cameras', 'electronics-cameras-drones'],
    imageUrls: [],
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function setup(getLatest: () => Promise<Listing[]>) {
  TestBed.configureTestingModule({
    imports: [ListingDetailSimilarItems, getTranslocoTestingModule()],
    providers: [{ provide: LISTING_REPOSITORY, useValue: { getLatest } }],
  });
  const fixture = TestBed.createComponent(ListingDetailSimilarItems);
  fixture.componentRef.setInput('listing', listing());
  return fixture;
}

describe('ListingDetailSimilarItems', () => {
  it('ranks an exact leaf match above a same-group, same-root, and unrelated listing', async () => {
    const exactLeafMatch = listing({
      id: 'exact',
      categoryPath: ['electronics', 'electronics-cameras', 'electronics-cameras-drones'],
    });
    const sameGroup = listing({
      id: 'same-group',
      categoryPath: ['electronics', 'electronics-cameras', 'electronics-cameras-lenses'],
    });
    const sameRoot = listing({
      id: 'same-root',
      categoryPath: ['electronics', 'electronics-phones', 'electronics-phones-smartphones'],
    });
    const unrelated = listing({
      id: 'unrelated',
      categoryPath: ['home-furniture', 'home-furniture-decor'],
    });
    const fixture = setup(() => Promise.resolve([unrelated, sameRoot, exactLeafMatch, sameGroup]));

    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance.similarListings().map((l) => l.id)).toEqual([
      'exact',
      'same-group',
      'same-root',
      'unrelated',
    ]);
  });

  it('excludes the listing itself and non-active listings', async () => {
    const draft = listing({ id: 'draft', status: 'draft' });
    const self = listing({ id: 'target' });
    const active = listing({ id: 'other-active' });
    const fixture = setup(() => Promise.resolve([draft, self, active]));

    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance.similarListings().map((l) => l.id)).toEqual(['other-active']);
  });

  it('clears similarListings instead of throwing when the repository fails', async () => {
    const fixture = setup(() => Promise.reject(new Error('boom')));

    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance.similarListings()).toEqual([]);
  });
});
