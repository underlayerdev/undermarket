import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SkeletonComponent } from '@underlayerdev/ui';
import { ListingDetailLoadingComponent } from './listing-detail-loading';

describe('ListingDetailLoadingComponent', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [ListingDetailLoadingComponent],
    });

    const fixture = TestBed.createComponent(ListingDetailLoadingComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should size the gallery placeholder to the same custom property the real gallery uses', () => {
    const fixture = setup();
    const skeleton = fixture.debugElement.query(By.css('.um-listing-detail-loading__media'))
      .componentInstance as SkeletonComponent;
    expect(skeleton.height()).toBe('var(--listing-detail-media-height)');
  });

  it('should render a row of card placeholders for the similar-items section', () => {
    const fixture = setup();
    const cards = fixture.nativeElement.querySelectorAll('.um-listing-detail-loading__card');
    expect(cards.length).toBeGreaterThan(0);
    cards.forEach((card: HTMLElement) => {
      expect(card.querySelector('.um-listing-detail-loading__card-media')).toBeTruthy();
    });
  });

  it("should leave the card media placeholder without a height input, so the stylesheet's aspect-ratio sizes it", () => {
    // ul-skeleton applies a height input as an inline style, which beats the
    // `aspect-ratio` + `height: auto` in listing-detail-loading.scss — a
    // height input here previously fought that rule and would silently
    // collapse the square placeholder.
    const fixture = setup();
    const skeleton = fixture.debugElement.query(By.css('.um-listing-detail-loading__card-media'))
      .componentInstance as SkeletonComponent;
    expect(skeleton.height()).toBeNull();
  });

  it('should render a description placeholder with several text lines', () => {
    const fixture = setup();
    const skeletons = fixture.debugElement.queryAll(By.directive(SkeletonComponent));
    const textSkeleton = skeletons.find(
      (el) => (el.componentInstance as SkeletonComponent).variant() === 'text',
    );
    expect(textSkeleton).toBeTruthy();
    expect((textSkeleton!.componentInstance as SkeletonComponent).lines()).toBeGreaterThan(1);
  });

  it('should render a two-button dock placeholder', () => {
    const fixture = setup();
    const dock = fixture.nativeElement.querySelector('.um-listing-detail-loading__dock');
    expect(dock.querySelectorAll('ul-skeleton').length).toBe(2);
  });
});
