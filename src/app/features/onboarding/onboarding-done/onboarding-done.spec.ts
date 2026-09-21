import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../../../application/services/auth.service';
import { ErrorService } from '../../../application/services/error.service';
import { UserService } from '../../../application/services/user.service';
import { mockUser } from '../../../domain/user/user.mock';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';
import { OnboardingService } from '../onboarding.service';
import { OnboardingDoneComponent } from './onboarding-done';

describe('OnboardingDoneComponent', () => {
  let navigateByUrlSpy: ReturnType<typeof vi.fn>;
  let updateProfileSpy: ReturnType<typeof vi.fn>;

  function setup() {
    navigateByUrlSpy = vi.fn().mockResolvedValue(true);
    updateProfileSpy = vi.fn().mockResolvedValue(undefined);
    const profile = mockUser({ id: 'user-1' });

    TestBed.configureTestingModule({
      imports: [OnboardingDoneComponent, getTranslocoTestingModule()],
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
      ],
    });

    const fixture = TestBed.createComponent(OnboardingDoneComponent);
    fixture.detectChanges();
    return { fixture, onboardingService: TestBed.inject(OnboardingService) };
  }

  it('should create', () => {
    const { fixture } = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should register itself as the done step, outside the stepper and with no way back', () => {
    const { onboardingService } = setup();

    expect(onboardingService.step().id).toBe('done');
    expect(onboardingService.stepperPosition()).toBe(0);
    expect(onboardingService.showBack()).toBe(false);
  });

  it('should navigate out of the flow when the CTA is clicked', () => {
    const { fixture } = setup();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('ul-button button');

    button.click();

    // ONBOARDING_EXIT_ROUTE, which navigateByUrl resolves from the root without
    // needing a leading slash.
    expect(navigateByUrlSpy).toHaveBeenCalledWith('home');
  });

  it('should write nothing — the profile was already saved by the earlier steps', () => {
    const { fixture } = setup();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('ul-button button');

    button.click();

    expect(updateProfileSpy).not.toHaveBeenCalled();
  });
});
