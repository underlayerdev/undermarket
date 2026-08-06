import { TestBed } from '@angular/core/testing';
import { DiscoverComponent } from './discover';
import { ListingService } from '../../application/services/listing.service';

describe('DiscoverComponent', () => {
  let loadLatestSpy: ReturnType<typeof vi.fn>;
  let searchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    loadLatestSpy = vi.fn().mockResolvedValue(undefined);
    searchSpy = vi.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      imports: [DiscoverComponent],
      providers: [
        {
          provide: ListingService,
          useValue: { loadLatest: loadLatestSpy, search: searchSpy, listings: () => [] },
        },
      ],
    });
  });

  it('should create and load the latest listings', () => {
    const fixture = TestBed.createComponent(DiscoverComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(loadLatestSpy).toHaveBeenCalled();
  });

  it('should search by category when one is selected', () => {
    const fixture = TestBed.createComponent(DiscoverComponent);
    fixture.detectChanges();

    fixture.componentInstance.selectCategory('Books');

    expect(fixture.componentInstance.selectedCategory()).toBe('Books');
    expect(searchSpy).toHaveBeenCalledWith({ category: 'Books' });
  });

  it('should reload the latest listings when the category is cleared', () => {
    const fixture = TestBed.createComponent(DiscoverComponent);
    fixture.detectChanges();
    loadLatestSpy.mockClear();

    fixture.componentInstance.selectCategory('Books');
    fixture.componentInstance.selectCategory(null);

    expect(fixture.componentInstance.selectedCategory()).toBeNull();
    expect(loadLatestSpy).toHaveBeenCalled();
  });
});
