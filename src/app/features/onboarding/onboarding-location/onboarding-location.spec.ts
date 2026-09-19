import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { OnboardingLocationComponent } from './onboarding-location';
import { OnboardingLocationService } from './onboarding-location.service';
import { OnboardingProgressService } from '../shared/onboarding-progress/onboarding-progress.service';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';

describe('OnboardingLocationComponent', () => {
  let onLocationQueryChangedSpy: ReturnType<typeof vi.fn>;
  let onUseCurrentLocationSpy: ReturnType<typeof vi.fn>;
  let onLocationPickedSpy: ReturnType<typeof vi.fn>;
  let mapPreview: { url: string; label: string } | null;
  let navigateByUrlSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mapPreview = null;
  });

  function setup() {
    onLocationQueryChangedSpy = vi.fn();
    onUseCurrentLocationSpy = vi.fn();
    onLocationPickedSpy = vi.fn();
    navigateByUrlSpy = vi.fn().mockResolvedValue(true);

    TestBed.configureTestingModule({
      imports: [OnboardingLocationComponent, getTranslocoTestingModule()],
      providers: [
        { provide: Router, useValue: { navigateByUrl: navigateByUrlSpy } },
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
    return fixture;
  }

  it('should create', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should report itself as step 3 on activation', () => {
    setup();

    expect(TestBed.inject(OnboardingProgressService).currentStep()).toBe(3);
  });

  it('should delegate "use current location" clicks to the service', () => {
    const fixture = setup();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('ul-button button');

    button.click();

    expect(onUseCurrentLocationSpy).toHaveBeenCalledTimes(1);
  });

  it('should not render a map preview until the service has one', () => {
    const fixture = setup();

    expect(fixture.nativeElement.querySelector('.onboarding__map-preview')).toBeNull();
  });

  it('should render the digested map preview once the service resolves one', () => {
    mapPreview = { url: 'https://api.mapbox.com/preview.png', label: 'Palermo, Buenos Aires' };
    const fixture = setup();

    const img: HTMLImageElement = fixture.nativeElement.querySelector(
      '.onboarding__map-preview img',
    );
    expect(img.src).toBe('https://api.mapbox.com/preview.png');
    expect(img.alt).toBe('Palermo, Buenos Aires');
    expect(fixture.nativeElement.textContent).toContain('Palermo, Buenos Aires');
  });

  describe('back navigation', () => {
    it('should navigate back to the photo step', () => {
      const fixture = setup();

      fixture.componentInstance.back();

      expect(navigateByUrlSpy).toHaveBeenCalledWith('onboarding/photo');
    });
  });

  describe('finishing', () => {
    it('should navigate to the done step — displayName/photoUrl were already saved by the earlier steps', async () => {
      const fixture = setup();

      await fixture.componentInstance.finish();

      expect(navigateByUrlSpy).toHaveBeenCalledWith('onboarding/done');
      expect(fixture.componentInstance.isNavigating()).toBe(false);
    });

    it('should show a loading state while the done route resolves', async () => {
      const fixture = setup();
      let resolveNavigation!: (value: boolean) => void;
      navigateByUrlSpy.mockReturnValueOnce(
        new Promise<boolean>((resolve) => {
          resolveNavigation = resolve;
        }),
      );

      const finished = fixture.componentInstance.finish();
      expect(fixture.componentInstance.isNavigating()).toBe(true);

      resolveNavigation(true);
      await finished;

      expect(fixture.componentInstance.isNavigating()).toBe(false);
    });
  });
});
