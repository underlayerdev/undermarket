import { TestBed } from '@angular/core/testing';
import { ListingDetailStatusComponent } from './listing-detail-status';
import { getTranslocoTestingModule } from '../../../../../testing/transloco-testing';
import type { Listing } from '../../../../domain/listing/listing.model';

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

describe('ListingDetailStatusComponent', () => {
  function setup(item: Listing) {
    TestBed.configureTestingModule({
      imports: [ListingDetailStatusComponent, getTranslocoTestingModule()],
    });

    const fixture = TestBed.createComponent(ListingDetailStatusComponent);
    fixture.componentRef.setInput('item', item);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = setup(listing());
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show "Sold" for a sold listing', () => {
    const fixture = setup(listing({ status: 'sold' }));

    expect(fixture.nativeElement.textContent).toContain('Sold');
  });

  it('should show "Draft" for a draft listing', () => {
    const fixture = setup(listing({ status: 'draft' }));

    expect(fixture.nativeElement.textContent).toContain('Draft');
  });

  it('should show "Available" for an active listing', () => {
    const fixture = setup(listing({ status: 'active' }));

    expect(fixture.nativeElement.textContent).toContain('Available');
  });

  it('should render exactly one status pill', () => {
    const fixture = setup(listing({ status: 'active' }));

    expect(fixture.nativeElement.querySelectorAll('ul-pill').length).toBe(1);
  });
});
