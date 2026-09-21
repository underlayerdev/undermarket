import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../../../application/services/auth.service';
import { ErrorService } from '../../../application/services/error.service';
import { UserService } from '../../../application/services/user.service';
import { mockUser } from '../../../domain/user/user.mock';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';
import { OnboardingService } from '../onboarding.service';
import { OnboardingLocationComponent } from './onboarding-location';
import { OnboardingLocationService } from './onboarding-location.service';

describe('OnboardingLocationComponent', () => {
  let onLocationQueryChangedSpy: ReturnType<typeof vi.fn>;
  let onUseCurrentLocationSpy: ReturnType<typeof vi.fn>;
  let onLocationPickedSpy: ReturnType<typeof vi.fn>;
  let mapPreview: { url: string; label: string } | null;
  let navigateByUrlSpy: ReturnType<typeof vi.fn>;
  let updateProfileSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mapPreview = null;
  });

  function setup() {
    onLocationQueryChangedSpy = vi.fn();
    onUseCurrentLocationSpy = vi.fn();
    onLocationPickedSpy = vi.fn();
    navigateByUrlSpy = vi.fn().mockResolvedValue(true);
    updateProfileSpy = vi.fn().mockResolvedValue(undefined);
    const profile = mockUser({ id: 'user-1' });

    TestBed.configureTestingModule({
      imports: [OnboardingLocationComponent, getTranslocoTestingModule()],
      providers: [
        { provide: Router, useValue: { navigateByUrl: navigateByUrlSpy } },
        {
          provide: UserService,
          useValue: { profile: () => profile, updateProfile: updateProfileSpy },
        },
        {
          provide: AuthService,
          useValue: {
            currentUser: () => profile,
            updateDisplayName: vi.fn(),
            updatePhotoUrl: vi.fn(),
          },
        },
        { provide: ErrorService, useValue: { toUserMessage: () => 'Something went wrong.' } },
        {
          provide: OnboardingLocationService,
          useValue: {
            locationSuggestions: () => [],
            isResolvingLocation: () => false,
            locationError: () => null,
            mapPreview: () => mapPreview,
            onLocationQueryChanged: onLocationQueryChangedSpy,
            onUseCurrentLocation: onUseCurrentLocationSpy,
            onLocationPicked: onLocationPickedSpy,
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(OnboardingLocationComponent);
    fixture.detectChanges();
    return { fixture, onboardingService: TestBed.inject(OnboardingService) };
  }

  it('should create', () => {
    const { fixture } = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should register itself as the location step', () => {
    const { onboardingService } = setup();

    expect(onboardingService.step().id).toBe('location');
    expect(onboardingService.stepperPosition()).toBe(3);
  });

  it('should label Continue as the last step of the flow', () => {
    const { onboardingService } = setup();

    expect(onboardingService.continueLabel()).toBe('Finish');
  });

  it('should delegate "use current location" clicks to the service', () => {
    const { fixture } = setup();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('ul-button button');

    button.click();

    expect(onUseCurrentLocationSpy).toHaveBeenCalledTimes(1);
  });

  it('should not render a map preview until the service has one', () => {
    const { fixture } = setup();

    expect(fixture.nativeElement.querySelector('.onboarding__map-preview')).toBeNull();
  });

  it('should render the digested map preview once the service resolves one', () => {
    mapPreview = { url: 'https://api.mapbox.com/preview.png', label: 'Palermo, Buenos Aires' };
    const { fixture } = setup();

    const img: HTMLImageElement = fixture.nativeElement.querySelector(
      '.onboarding__map-preview img',
    );
    expect(img.src).toBe('https://api.mapbox.com/preview.png');
    expect(img.alt).toBe('Palermo, Buenos Aires');
    expect(fixture.nativeElement.textContent).toContain('Palermo, Buenos Aires');
  });

  it('should navigate back to the photo step', async () => {
    const { onboardingService } = setup();

    await onboardingService.goBack();

    expect(navigateByUrlSpy).toHaveBeenCalledWith('onboarding/photo');
  });

  it('should advance to the done step without writing to the profile', async () => {
    const { onboardingService } = setup();

    await onboardingService.continue();

    // The picked location is saved to userSearchLocations as it's picked, not
    // onto the user profile, so this step has nothing of its own to persist.
    expect(updateProfileSpy).not.toHaveBeenCalled();
    expect(navigateByUrlSpy).toHaveBeenCalledWith('onboarding/done');
  });
});
