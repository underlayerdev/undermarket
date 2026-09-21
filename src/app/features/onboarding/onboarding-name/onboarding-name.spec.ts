import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../../../application/services/auth.service';
import { ErrorService } from '../../../application/services/error.service';
import { UserService } from '../../../application/services/user.service';
import { mockUser } from '../../../domain/user/user.mock';
import type { User } from '../../../domain/user/user.model';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';
import { OnboardingService } from '../onboarding.service';
import { OnboardingNameComponent } from './onboarding-name';

describe('OnboardingNameComponent', () => {
  let profile: User | null;
  let navigateByUrlSpy: ReturnType<typeof vi.fn>;
  let updateProfileSpy: ReturnType<typeof vi.fn>;
  let updateDisplayNameSpy: ReturnType<typeof vi.fn>;

  // The real OnboardingService, since what this step does on Continue is the
  // registration it hands over — mocking that away would test nothing.
  function setup() {
    navigateByUrlSpy = vi.fn().mockResolvedValue(true);
    updateProfileSpy = vi.fn().mockResolvedValue(undefined);
    updateDisplayNameSpy = vi.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      imports: [OnboardingNameComponent, getTranslocoTestingModule()],
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
            updateDisplayName: updateDisplayNameSpy,
            updatePhotoUrl: vi.fn(),
          },
        },
        { provide: ErrorService, useValue: { toUserMessage: () => 'Something went wrong.' } },
      ],
    });

    const fixture = TestBed.createComponent(OnboardingNameComponent);
    fixture.detectChanges();
    return { fixture, onboardingService: TestBed.inject(OnboardingService) };
  }

  beforeEach(() => {
    profile = mockUser({ id: 'user-1', displayName: '' });
  });

  it('should create', () => {
    const { fixture } = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should register itself as the name step', () => {
    const { onboardingService } = setup();

    expect(onboardingService.step().id).toBe('name');
    expect(onboardingService.stepperPosition()).toBe(1);
  });

  it('should offer no back button — it is the first step of the flow', () => {
    const { onboardingService } = setup();

    expect(onboardingService.showBack()).toBe(false);
  });

  it('should prefill the field from the signed-in account', () => {
    profile = mockUser({ id: 'user-1', displayName: 'Jane Doe' });
    const { fixture } = setup();

    expect(fixture.componentInstance.displayNameValue()).toBe('Jane Doe');
  });

  it('should withhold the validation message until the field is blurred', () => {
    const { fixture } = setup();
    fixture.componentInstance.displayNameValue.set('J');

    expect(fixture.componentInstance.displayNameError()).toBeNull();

    fixture.componentInstance.markTouched();

    expect(fixture.componentInstance.displayNameError()).toContain('at least');
  });

  it.each([
    ['', false],
    ['J', false],
    ['Jane Doe', true],
  ])('should gate Continue on the name being valid (%s)', (value, expected) => {
    const { fixture, onboardingService } = setup();

    fixture.componentInstance.displayNameValue.set(value);

    expect(onboardingService.canContinue()).toBe(expected);
  });

  it('should save the trimmed name and advance to the photo step on continue', async () => {
    const { fixture, onboardingService } = setup();
    fixture.componentInstance.displayNameValue.set('  Jane Doe  ');

    await onboardingService.continue();

    expect(updateProfileSpy).toHaveBeenCalledWith({ ...profile, displayName: 'Jane Doe' });
    expect(updateDisplayNameSpy).toHaveBeenCalledWith('Jane Doe');
    expect(navigateByUrlSpy).toHaveBeenCalledWith('onboarding/photo');
  });

  it('should neither save nor advance while the name is invalid', async () => {
    const { fixture, onboardingService } = setup();
    fixture.componentInstance.displayNameValue.set('J');

    await onboardingService.continue();

    expect(updateProfileSpy).not.toHaveBeenCalled();
    expect(navigateByUrlSpy).not.toHaveBeenCalled();
  });

  it('should write nothing when the prefilled name is continued past unchanged', async () => {
    profile = mockUser({ id: 'user-1', displayName: 'Jane Doe' });
    const { onboardingService } = setup();

    await onboardingService.continue();

    expect(updateProfileSpy).not.toHaveBeenCalled();
    expect(navigateByUrlSpy).toHaveBeenCalledWith('onboarding/photo');
  });
});
