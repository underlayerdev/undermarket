import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../../../application/services/auth.service';
import { ErrorService } from '../../../application/services/error.service';
import { UserService } from '../../../application/services/user.service';
import { mockUser } from '../../../domain/user/user.mock';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';
import { OnboardingService } from '../onboarding.service';
import { OnboardingWelcomeComponent } from './onboarding-welcome';

describe('OnboardingWelcomeComponent', () => {
  let navigateByUrlSpy: ReturnType<typeof vi.fn>;
  let updateProfileSpy: ReturnType<typeof vi.fn>;

  function setup() {
    navigateByUrlSpy = vi.fn().mockResolvedValue(true);
    updateProfileSpy = vi.fn().mockResolvedValue(undefined);
    const profile = mockUser({ id: 'user-1' });

    TestBed.configureTestingModule({
      imports: [OnboardingWelcomeComponent, getTranslocoTestingModule()],
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

    const fixture = TestBed.createComponent(OnboardingWelcomeComponent);
    fixture.detectChanges();
    return { fixture, onboardingService: TestBed.inject(OnboardingService) };
  }

  it('should create', () => {
    const { fixture } = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should register itself as the welcome step, outside the stepper', () => {
    const { onboardingService } = setup();

    expect(onboardingService.step().id).toBe('welcome');
    expect(onboardingService.stepperPosition()).toBe(0);
    expect(onboardingService.showBack()).toBe(false);
  });

  it('should label its button from the config', () => {
    const { fixture } = setup();

    expect(fixture.nativeElement.textContent).toContain('Get started');
  });

  it('should navigate to the name step when "get started" is clicked', () => {
    const { fixture } = setup();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('ul-button button');

    button.click();

    expect(navigateByUrlSpy).toHaveBeenCalledWith('onboarding/name');
  });

  it('should write nothing — there is nothing to collect on this screen', async () => {
    const { onboardingService } = setup();

    await onboardingService.continue();

    expect(updateProfileSpy).not.toHaveBeenCalled();
  });
});
