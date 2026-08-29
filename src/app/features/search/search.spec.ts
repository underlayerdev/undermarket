import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { SearchComponent } from './search';
import { ListingService } from '../../application/services/listing.service';
import { getTranslocoTestingModule } from '../../../testing/transloco-testing';

describe('SearchComponent', () => {
  let searchSpy: ReturnType<typeof vi.fn>;
  let locationBackSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
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

  it('should navigate back when closed', () => {
    const fixture = TestBed.createComponent(SearchComponent);

    fixture.componentInstance.onClose();

    expect(locationBackSpy).toHaveBeenCalled();
  });
});
