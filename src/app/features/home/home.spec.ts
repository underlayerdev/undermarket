import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomeComponent } from './home';
import { ListingService } from '../../application/services/listing.service';
import { getTranslocoTestingModule } from '../../../testing/transloco-testing';

describe('HomeComponent', () => {
  let loadLatestSpy: ReturnType<typeof vi.fn>;

  function setup(loadLatestImpl: () => Promise<void> = () => Promise.resolve()) {
    loadLatestSpy = vi.fn(loadLatestImpl);

    TestBed.configureTestingModule({
      imports: [HomeComponent, getTranslocoTestingModule()],
      providers: [
        provideRouter([]),
        { provide: ListingService, useValue: { loadLatest: loadLatestSpy, listings: () => [] } },
      ],
    });

    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should be loading until loadLatest resolves', async () => {
    const fixture = setup();
    expect(fixture.componentInstance.isLoading()).toBe(true);

    await fixture.whenStable();

    expect(fixture.componentInstance.isLoading()).toBe(false);
    expect(loadLatestSpy).toHaveBeenCalled();
  });

  it('should stop loading and surface an error toast when loadLatest rejects', async () => {
    const fixture = setup(() => Promise.reject(new Error('offline')));

    await fixture.whenStable();

    expect(fixture.componentInstance.isLoading()).toBe(false);
  });

  it('should expose 8 skeleton placeholders', () => {
    const fixture = setup();

    expect(fixture.componentInstance.skeletonRows()).toHaveLength(8);
  });
});
