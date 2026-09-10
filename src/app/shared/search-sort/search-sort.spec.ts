import { TestBed } from '@angular/core/testing';
import { SearchSortComponent } from './search-sort';

describe('SearchSortComponent', () => {
  function setup(sortOptions = [{ value: 'newest', label: 'Newest' }]) {
    TestBed.configureTestingModule({ imports: [SearchSortComponent] });

    const fixture = TestBed.createComponent(SearchSortComponent);
    fixture.componentRef.setInput('sortOptions', sortOptions);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render whatever sort options the caller provides', () => {
    const fixture = setup([
      { value: 'newest', label: 'Newest' },
      { value: 'oldest', label: 'Oldest' },
    ]);
    expect(fixture.componentInstance.sortOptions().map((option) => option.value)).toEqual([
      'newest',
      'oldest',
    ]);
  });

  it('should update the query model when set', () => {
    const fixture = setup();
    fixture.componentInstance.query.set('lamp');
    expect(fixture.componentInstance.query()).toBe('lamp');
  });

  it('should update the sort model when set', () => {
    const fixture = setup();
    fixture.componentInstance.sort.set('newest');
    expect(fixture.componentInstance.sort()).toBe('newest');
  });
});
