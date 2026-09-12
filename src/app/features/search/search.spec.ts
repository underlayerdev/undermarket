import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { SearchComponent } from './search';
import { ListingService } from '../../application/services/listing.service';
import { getTranslocoTestingModule } from '../../../testing/transloco-testing';
import { installFakeLocalStorage } from '../../../testing/fake-local-storage';
import { getRecentSearches } from '../../shared/search/recent-searches.util';

describe('SearchComponent', () => {
  let searchSpy: ReturnType<typeof vi.fn>;
  let locationBackSpy: ReturnType<typeof vi.fn>;
  let restoreLocalStorage: () => void;

  beforeEach(() => {
    restoreLocalStorage = installFakeLocalStorage();
    searchSpy = vi.fn().mockResolvedValue(undefined);
    locationBackSpy = vi.fn();

    TestBed.configureTestingModule({
      imports: [SearchComponent, getTranslocoTestingModule()],
      providers: [
        {
          provide: ListingService,
          useValue: { search: searchSpy, listings: () => [] },
        },
        { provide: Location, useValue: { back: locationBackSpy } },
      ],
    });
  });

  afterEach(() => {
    restoreLocalStorage();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(SearchComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should populate query and trigger search when the q input is set', () => {
    const fixture = TestBed.createComponent(SearchComponent);
    fixture.componentRef.setInput('q', 'foo');
    fixture.detectChanges();

    expect(fixture.componentInstance.query()).toBe('foo');
    expect(searchSpy).toHaveBeenCalledWith({ query: 'foo', category: undefined });
  });

  it('should not trigger a duplicate search when q is set to the same value already applied', () => {
    const fixture = TestBed.createComponent(SearchComponent);
    fixture.componentRef.setInput('q', 'foo');
    fixture.detectChanges();
    searchSpy.mockClear();

    fixture.componentRef.setInput('q', 'foo');
    fixture.detectChanges();

    expect(searchSpy).not.toHaveBeenCalled();
  });

  it('should navigate back when the back button is clicked', () => {
    const fixture = TestBed.createComponent(SearchComponent);

    fixture.componentInstance.goBack();

    expect(locationBackSpy).toHaveBeenCalled();
  });

  it('should render a ul-search-input for both the mobile header and desktop row', () => {
    const fixture = TestBed.createComponent(SearchComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('ul-search-input').length).toBe(2);
  });

  it('should record a submitted search into recent searches and trigger the search', () => {
    const fixture = TestBed.createComponent(SearchComponent);
    // Mirrors ul-search-input's [(value)] already having synced `query` from
    // typing by the time it emits searchSubmit on Enter.
    fixture.componentInstance.query.set('lamp');

    fixture.componentInstance.onSearchSubmit('lamp');

    expect(getRecentSearches('listings')).toEqual(['lamp']);
    expect(fixture.componentInstance.recentSearchSuggestions()).toEqual([
      { value: 'lamp', label: 'lamp' },
    ]);
    expect(searchSpy).toHaveBeenCalledWith({ query: 'lamp', category: undefined });
  });

  it('should record a picked suggestion into recent searches and trigger the search', () => {
    const fixture = TestBed.createComponent(SearchComponent);
    fixture.componentInstance.query.set('lamp');

    fixture.componentInstance.onSuggestionSelected({ value: 'lamp', label: 'lamp' });

    expect(getRecentSearches('listings')).toEqual(['lamp']);
    expect(searchSpy).toHaveBeenCalled();
  });

  it('should not record a blank submitted search', () => {
    const fixture = TestBed.createComponent(SearchComponent);

    fixture.componentInstance.onSearchSubmit('   ');

    expect(getRecentSearches('listings')).toEqual([]);
  });
});
