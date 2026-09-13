import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProfileListingsComponent } from './profile-listings';
import { LISTING_REPOSITORY } from '../../../core/configuration/tokens';
import type { Listing } from '../../../domain/listing/listing.model';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';
import { installFakeLocalStorage } from '../../../../testing/fake-local-storage';
import { getRecentSearches } from '../../../shared/search/recent-searches.util';

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

// jsdom doesn't implement matchMedia at all — ul-search-input's mobile
// breakpoint check needs it assigned outright, not spied on.
function mockMatchMedia(matches: boolean): void {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  }));
}

describe('ProfileListingsComponent', () => {
  let getByOwnerSpy: ReturnType<typeof vi.fn>;
  let getPublicByOwnerSpy: ReturnType<typeof vi.fn>;
  let restoreLocalStorage: () => void;

  beforeEach(() => {
    restoreLocalStorage = installFakeLocalStorage();
  });

  afterEach(() => {
    restoreLocalStorage();
  });

  function setup(listings: Listing[] = [listing()], publicView = false) {
    getByOwnerSpy = vi.fn().mockResolvedValue(listings);
    getPublicByOwnerSpy = vi.fn().mockResolvedValue(listings);

    TestBed.configureTestingModule({
      imports: [ProfileListingsComponent, getTranslocoTestingModule()],
      providers: [
        provideRouter([]),
        {
          provide: LISTING_REPOSITORY,
          useValue: { getByOwner: getByOwnerSpy, getPublicByOwner: getPublicByOwnerSpy },
        },
      ],
    });

    const fixture = TestBed.createComponent(ProfileListingsComponent);
    fixture.componentRef.setInput('ownerId', 'user-1');
    fixture.componentRef.setInput('publicView', publicView);
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

  it('should record a submitted search into recent searches', async () => {
    const fixture = setup();
    await flushAsync();

    fixture.componentInstance.onSearchSubmit('lamp');

    expect(getRecentSearches('profile-listings')).toEqual(['lamp']);
    expect(fixture.componentInstance.recentSearchSuggestions()).toEqual([
      { value: 'lamp', label: 'lamp' },
    ]);
  });

  it('should record a picked suggestion into recent searches', async () => {
    const fixture = setup();
    await flushAsync();

    fixture.componentInstance.onSuggestionSelected({ value: 'lamp', label: 'lamp' });

    expect(getRecentSearches('profile-listings')).toEqual(['lamp']);
  });

  it('should not record a blank submitted search', async () => {
    const fixture = setup();
    await flushAsync();

    fixture.componentInstance.onSearchSubmit('   ');

    expect(getRecentSearches('profile-listings')).toEqual([]);
  });

  it('should show a second listings list with live results inside the mobile search takeover', async () => {
    mockMatchMedia(true);
    const fixture = setup([
      listing({ id: 'a', title: 'Vintage lamp' }),
      listing({ id: 'b', title: 'Mountain bike' }),
    ]);
    await flushAsync();
    fixture.detectChanges();

    const trigger: HTMLInputElement = fixture.nativeElement.querySelector('ul-search-input input');
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    const takeoverInput: HTMLInputElement = fixture.nativeElement.querySelector(
      '.ul-search-input__combobox--takeover input',
    );
    takeoverInput.value = 'lamp';
    takeoverInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    // The takeover's projected content is a DOM descendant of the toolbar's
    // own um-listings-list (content projection doesn't move it elsewhere),
    // so scope the assertion to the takeover panel specifically rather than
    // counting um-listings-list elements page-wide.
    const takeoverRows = fixture.nativeElement.querySelectorAll(
      '.ul-search-input__list--takeover .um-listing-list__row',
    );
    expect(takeoverRows.length).toBe(1);
    expect(takeoverRows[0].textContent).toContain('Vintage lamp');
  });

  describe('publicView', () => {
    it('should call getPublicByOwner instead of getByOwner', async () => {
      const fixture = setup([listing({ id: 'a' })], true);
      await flushAsync();

      expect(getPublicByOwnerSpy).toHaveBeenCalledWith('user-1');
      expect(getByOwnerSpy).not.toHaveBeenCalled();
      expect(fixture.componentInstance.listings().map((l) => l.id)).toEqual(['a']);
    });

    it('should use the seller-facing title instead of "My listings"', async () => {
      const fixture = setup([listing({ id: 'a' }), listing({ id: 'b' })], true);
      await flushAsync();

      expect(fixture.componentInstance.title()).toBe('Listings (2)');
    });

    it('should not show the "post a listing" empty-state button', async () => {
      const fixture = setup([], true);
      await flushAsync();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).not.toContain('Post a Listing');
      expect(fixture.nativeElement.textContent).toContain('This user has not posted');
    });
  });
});
