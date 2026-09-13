import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ListingGridComponent } from './listing-grid';
import type { Listing } from '../../../domain/listing/listing.model';

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

describe('ListingGridComponent', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [ListingGridComponent],
      providers: [provideRouter([])],
    });
    return TestBed.createComponent(ListingGridComponent);
  }

  it('should create', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show the empty state text when there are no listings', () => {
    const fixture = setup();
    fixture.componentRef.setInput('emptyStateText', 'No listings found');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No listings found');
    expect(fixture.nativeElement.querySelectorAll('ul-card').length).toBe(0);
  });

  it('should render one card per listing, linked to its slug', () => {
    const fixture = setup();
    fixture.componentRef.setInput('listings', [
      listing({ id: 'a', title: 'Vintage lamp' }),
      listing({ id: 'b', title: 'Mountain bike' }),
    ]);
    fixture.detectChanges();

    const links: NodeListOf<HTMLAnchorElement> = fixture.nativeElement.querySelectorAll('a');
    expect(links.length).toBe(2);
    expect(links[0].getAttribute('href')).toContain('vintage-lamp-a');
    expect(links[1].getAttribute('href')).toContain('mountain-bike-b');
  });
});
