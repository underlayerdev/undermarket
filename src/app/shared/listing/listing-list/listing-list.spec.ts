import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ListingListComponent } from './listing-list';
import type { Listing } from '../../../domain/listing/listing.model';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';

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

describe('ListingListComponent', () => {
  function setup(listings: Listing[] = []) {
    TestBed.configureTestingModule({
      imports: [ListingListComponent, getTranslocoTestingModule()],
      providers: [provideRouter([])],
    });

    const fixture = TestBed.createComponent(ListingListComponent);
    fixture.componentRef.setInput('listings', listings);
    fixture.componentRef.setInput('isLoading', false);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should track selection and report someSelected/allSelected as items are checked', () => {
    const fixture = setup([listing({ id: 'a' }), listing({ id: 'b' })]);

    fixture.componentInstance.toggleSelect('a', true);
    expect(fixture.componentInstance.isSelected('a')).toBe(true);
    expect(fixture.componentInstance.allSelected()).toBe(false);
    expect(fixture.componentInstance.someSelected()).toBe(true);

    fixture.componentInstance.toggleSelect('b', true);
    expect(fixture.componentInstance.allSelected()).toBe(true);
    expect(fixture.componentInstance.someSelected()).toBe(false);
  });

  it('should select and deselect every listing via toggleSelectAll', () => {
    const fixture = setup([listing({ id: 'a' }), listing({ id: 'b' })]);

    fixture.componentInstance.toggleSelectAll(true);
    expect(fixture.componentInstance.hasSelection()).toBe(true);
    expect(fixture.componentInstance.selection().size).toBe(2);

    fixture.componentInstance.toggleSelectAll(false);
    expect(fixture.componentInstance.hasSelection()).toBe(false);
  });

  it('should render a skeleton row set while loading', () => {
    const fixture = setup([listing()]);
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('um-listing-list-skeleton')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.um-listing-list')).toBeFalsy();
  });

  it('should render a row per listing once loaded', () => {
    const fixture = setup([listing({ id: 'a' }), listing({ id: 'b' })]);

    expect(fixture.nativeElement.querySelectorAll('.um-listing-list__row').length).toBe(2);
  });
});
