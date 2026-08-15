import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NewListingComponent } from './new-listing';
import { AuthService } from '../../../application/services/auth.service';
import { ListingService } from '../../../application/services/listing.service';

describe('NewListingComponent', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [NewListingComponent],
      providers: [
        { provide: AuthService, useValue: { currentUser: () => null } },
        { provide: ListingService, useValue: { create: vi.fn() } },
        { provide: Router, useValue: { navigate: vi.fn() } },
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
});
