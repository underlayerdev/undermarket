import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListingListSkeletonComponent } from './listing-list-skeleton';

describe('ListingListSkeletonComponent', () => {
  let fixture: ComponentFixture<ListingListSkeletonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListingListSkeletonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ListingListSkeletonComponent);
  });

  function rowCount(): number {
    return fixture.nativeElement.querySelectorAll('.listing-list-skeleton__item').length;
  }

  it('should create', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render 4 rows by default', () => {
    fixture.detectChanges();
    expect(rowCount()).toBe(4);
  });

  it('should render the number of rows given by listingsAmount', () => {
    fixture.componentRef.setInput('listingsAmount', 7);
    fixture.detectChanges();
    expect(rowCount()).toBe(7);
  });

  it('should render no rows when listingsAmount is 0', () => {
    fixture.componentRef.setInput('listingsAmount', 0);
    fixture.detectChanges();
    expect(rowCount()).toBe(0);
  });

  it('should not throw and should render no rows for a negative listingsAmount', () => {
    fixture.componentRef.setInput('listingsAmount', -3);
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(rowCount()).toBe(0);
  });

  it('should expose a status role so assistive tech announces the loading state', () => {
    fixture.detectChanges();
    const container = fixture.nativeElement.querySelector('.listing-list-skeleton-container');
    expect(container.getAttribute('role')).toBe('status');
  });
});
