import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProfileListingsComponent } from './profile-listings';
import { ListingService } from '../../../application/services/listing.service';
import { LISTING_REPOSITORY } from '../../../core/configuration/tokens';
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

// fixture.whenStable() doesn't reliably wait out ngOnInit's async load —
// a real macrotask boundary guarantees every pending microtask has drained.
function flushAsync(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('ProfileListingsComponent', () => {
  let getByOwnerSpy: ReturnType<typeof vi.fn>;
  let deleteSpy: ReturnType<typeof vi.fn>;

  function setup(listings: Listing[] = [listing()]) {
    getByOwnerSpy = vi.fn().mockResolvedValue(listings);
    deleteSpy = vi.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      imports: [ProfileListingsComponent, getTranslocoTestingModule()],
      providers: [
        provideRouter([]),
        { provide: LISTING_REPOSITORY, useValue: { getByOwner: getByOwnerSpy } },
        { provide: ListingService, useValue: { delete: deleteSpy } },
      ],
    });

    const fixture = TestBed.createComponent(ProfileListingsComponent);
    fixture.componentRef.setInput('ownerId', 'user-1');
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load the owner listings', async () => {
    const fixture = setup([listing({ id: 'a' }), listing({ id: 'b' })]);
    await flushAsync();

    expect(getByOwnerSpy).toHaveBeenCalledWith('user-1');
    expect(fixture.componentInstance.listings().map((l) => l.id)).toEqual(['a', 'b']);
    expect(fixture.componentInstance.isLoading()).toBe(false);
  });

  it('should filter listings by title', async () => {
    const fixture = setup([
      listing({ id: 'a', title: 'Vintage lamp' }),
      listing({ id: 'b', title: 'Mountain bike' }),
    ]);
    await flushAsync();

    fixture.componentInstance.searchQuery.set('lamp');

    expect(fixture.componentInstance.filteredListings().map((l) => l.id)).toEqual(['a']);
  });

  it('should sort by title A-Z', async () => {
    const fixture = setup([
      listing({ id: 'b', title: 'Zebra print scarf' }),
      listing({ id: 'a', title: 'Antique clock' }),
    ]);
    await flushAsync();

    fixture.componentInstance.sortOption.set('title-asc');

    expect(fixture.componentInstance.filteredListings().map((l) => l.id)).toEqual(['a', 'b']);
  });

  it('should sort by newest first by default', async () => {
    const fixture = setup([
      listing({ id: 'older', createdAt: new Date('2026-01-01') }),
      listing({ id: 'newer', createdAt: new Date('2026-06-01') }),
    ]);
    await flushAsync();

    expect(fixture.componentInstance.filteredListings().map((l) => l.id)).toEqual([
      'newer',
      'older',
    ]);
  });

  it('should track selection via selectedIds once toggled', async () => {
    const fixture = setup([listing({ id: 'a' }), listing({ id: 'b' })]);
    await flushAsync();

    fixture.componentInstance.selectedIds.set(new Set(['a']));
    expect(fixture.componentInstance.hasSelection()).toBe(true);

    fixture.componentInstance.selectedIds.set(new Set());
    expect(fixture.componentInstance.hasSelection()).toBe(false);
  });

  it('should delete a single listing and reload from the server on confirm', async () => {
    const target = listing();
    const fixture = setup([target]);
    await flushAsync();
    getByOwnerSpy.mockResolvedValue([]);

    fixture.componentInstance.pendingDeleteIds.set([target.id]);
    expect(fixture.componentInstance.pendingDeleteCount()).toBe(1);

    await fixture.componentInstance.confirmDelete();

    expect(deleteSpy).toHaveBeenCalledWith(target.id);
    expect(getByOwnerSpy).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.listings()).toEqual([]);
  });

  it('should bulk-delete selected listings and clear the selection', async () => {
    const a = listing({ id: 'a' });
    const b = listing({ id: 'b' });
    const fixture = setup([a, b]);
    await flushAsync();
    getByOwnerSpy.mockResolvedValue([]);
    fixture.componentInstance.selectedIds.set(new Set(['a', 'b']));

    fixture.componentInstance.onBulkDeleteClick();
    expect(fixture.componentInstance.pendingDeleteCount()).toBe(2);

    await fixture.componentInstance.confirmDelete();

    expect(deleteSpy).toHaveBeenCalledWith('a');
    expect(deleteSpy).toHaveBeenCalledWith('b');
    expect(fixture.componentInstance.hasSelection()).toBe(false);
    expect(fixture.componentInstance.listings()).toEqual([]);
  });

  it('should do nothing when bulk delete is clicked with no selection', async () => {
    const fixture = setup();
    await flushAsync();

    fixture.componentInstance.onBulkDeleteClick();

    expect(fixture.componentInstance.pendingDeleteIds()).toBeNull();
  });

  it('should clear the pending delete on cancel', async () => {
    const target = listing();
    const fixture = setup([target]);
    await flushAsync();

    fixture.componentInstance.pendingDeleteIds.set([target.id]);
    fixture.componentInstance.cancelDelete();

    expect(fixture.componentInstance.pendingDeleteIds()).toBeNull();
  });
});
