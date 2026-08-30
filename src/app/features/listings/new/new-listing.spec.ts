import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NewListingComponent } from './new-listing';
import { AuthService } from '../../../application/services/auth.service';
import { ListingService } from '../../../application/services/listing.service';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';

describe('NewListingComponent', () => {
  function setup(overrides?: { authService?: object; listingService?: object; router?: object }) {
    TestBed.configureTestingModule({
      imports: [NewListingComponent, getTranslocoTestingModule()],
      providers: [
        { provide: AuthService, useValue: overrides?.authService ?? { currentUser: () => null } },
        { provide: ListingService, useValue: overrides?.listingService ?? { create: vi.fn() } },
        { provide: Router, useValue: overrides?.router ?? { navigate: vi.fn() } },
        { provide: Location, useValue: { back: vi.fn() } },
      ],
    });

    const fixture = TestBed.createComponent(NewListingComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should not show validation errors on required fields before they are touched', () => {
    const fixture = setup();
    const listing = fixture.componentInstance.listingForm;

    expect(listing.title().touched()).toBe(false);
    expect(listing.title().errors()).toEqual([]);
    expect(listing.description().errors()).toEqual([]);
    expect(listing.price().errors()).toEqual([]);
    expect(listing.category().errors()).toEqual([]);
  });

  it('should show a required error on a field once it is marked touched', () => {
    const fixture = setup();
    const listing = fixture.componentInstance.listingForm;

    listing.title().markAsTouched();
    fixture.detectChanges();

    expect(listing.title().errors().length).toBeGreaterThan(0);
  });

  it('should mark the title field touched when the rendered ul-input is blurred by the user', () => {
    const fixture = setup();
    const listing = fixture.componentInstance.listingForm;

    const nativeElement = fixture.nativeElement as HTMLElement;
    const titleInput = nativeElement.querySelector<HTMLInputElement>('ul-input input[type="text"]');
    titleInput!.dispatchEvent(new FocusEvent('blur'));
    fixture.detectChanges();

    expect(listing.title().touched()).toBe(true);
    expect(listing.title().errors().length).toBeGreaterThan(0);
  });

  it('should replace the current history entry when navigating to the newly created listing', async () => {
    const navigateSpy = vi.fn().mockResolvedValue(true);
    const createdListing = {
      id: 'abc123',
      ownerId: 'user-1',
      title: 'A perfectly valid title',
      description: 'A perfectly valid description for this listing.',
      price: 10,
      currency: 'USD',
      category: 'Electronics',
      imageUrls: [],
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const fixture = setup({
      authService: { currentUser: () => ({ id: 'user-1' }) },
      listingService: { create: vi.fn().mockResolvedValue(createdListing) },
      router: { navigate: navigateSpy },
    });

    fixture.componentInstance.listingModel.set({
      title: createdListing.title,
      description: createdListing.description,
      price: String(createdListing.price),
      currency: createdListing.currency,
      category: createdListing.category,
    });
    fixture.detectChanges();

    await fixture.componentInstance.onSubmit();

    expect(navigateSpy).toHaveBeenCalledWith(['/listings', 'a-perfectly-valid-title-abc123'], {
      replaceUrl: true,
    });
  });
});
