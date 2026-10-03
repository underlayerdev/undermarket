import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomeComponent } from './home';
import { ListingResultsStore } from '../../application/listing/listing-results.store';
import { LISTING_REPOSITORY } from '../../core/configuration/tokens';
import { SearchLocationService } from '../../application/services/search-location.service';
import { getTranslocoTestingModule } from '../../../testing/transloco-testing';
import type { ListingRepository } from '../../domain/listing/listing.repository';

// HomeComponent provides its own ListingResultsStore instance (not
// app-wide), so a test must resolve it through this component's own element
// injector — TestBed.inject() would only ever see a root-level instance.
function storeFor(fixture: ComponentFixture<HomeComponent>): ListingResultsStore {
  return fixture.debugElement.injector.get(ListingResultsStore);
}

describe('HomeComponent', () => {
  let getLatestSpy: ReturnType<typeof vi.fn<ListingRepository['getLatest']>>;

  function setup(getLatestImpl: ListingRepository['getLatest'] = async () => []) {
    getLatestSpy = vi.fn<ListingRepository['getLatest']>(getLatestImpl);

    TestBed.configureTestingModule({
      imports: [HomeComponent, getTranslocoTestingModule()],
      providers: [
        provideRouter([]),
        { provide: LISTING_REPOSITORY, useValue: { getLatest: getLatestSpy } },
        { provide: SearchLocationService, useValue: { searchLocation: () => null } },
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

  it('should be loading until getLatest resolves', async () => {
    const fixture = setup();
    expect(storeFor(fixture).isLoading()).toBe(true);

    await fixture.whenStable();

    expect(storeFor(fixture).isLoading()).toBe(false);
    expect(getLatestSpy).toHaveBeenCalled();
  });

  it('should stop loading without throwing when getLatest rejects', async () => {
    const fixture = setup(() => Promise.reject(new Error('offline')));

    await fixture.whenStable();

    expect(storeFor(fixture).isLoading()).toBe(false);
    expect(storeFor(fixture).hasError()).toBe(true);
  });
});
