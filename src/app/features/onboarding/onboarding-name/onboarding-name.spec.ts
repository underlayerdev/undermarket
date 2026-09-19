import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { OnboardingNameComponent } from './onboarding-name';
import { OnboardingNameService } from './onboarding-name.service';
import { OnboardingProgressService } from '../shared/onboarding-progress/onboarding-progress.service';
import { AuthService } from '../../../application/services/auth.service';
import { UserService } from '../../../application/services/user.service';
import { mockUser } from '../../../domain/user/user.mock';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';

describe('OnboardingNameComponent', () => {
  let markTouchedSpy: ReturnType<typeof vi.fn>;
  let canContinue: boolean;
  let navigateByUrlSpy: ReturnType<typeof vi.fn>;
  let updateProfileSpy: ReturnType<typeof vi.fn>;
  let updateDisplayNameSpy: ReturnType<typeof vi.fn>;
  let profile: object | null;

  function setup() {
    markTouchedSpy = vi.fn();
    navigateByUrlSpy = vi.fn().mockResolvedValue(true);
    updateProfileSpy = vi.fn().mockResolvedValue(undefined);
    updateDisplayNameSpy = vi.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      imports: [OnboardingNameComponent, getTranslocoTestingModule()],
      providers: [
        { provide: Router, useValue: { navigateByUrl: navigateByUrlSpy } },
        {
          provide: AuthService,
          useValue: { updateDisplayName: updateDisplayNameSpy },
        },
        {
          provide: UserService,
          useValue: { profile: () => profile, updateProfile: updateProfileSpy },
        },
        {
          provide: OnboardingNameService,
          useValue: {
            displayNameValue: Object.assign(() => 'Jane Doe', { set: vi.fn() }),
            displayNameError: () => null,
            canContinue: () => canContinue,
            markTouched: markTouchedSpy,
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(OnboardingNameComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    canContinue = true;
    profile = mockUser({ id: 'user-1' });
  });

  it('should create', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should report itself as step 1 on activation', () => {
    setup();

    expect(TestBed.inject(OnboardingProgressService).currentStep()).toBe(1);
  });

  it('should not show a back button', () => {
    const fixture = setup();

    expect(fixture.nativeElement.querySelectorAll('button').length).toBe(1);
  });

  it('should save the display name to Firestore and Auth, then navigate to the photo step', async () => {
    const fixture = setup();

    await fixture.componentInstance.continue();

    expect(markTouchedSpy).toHaveBeenCalledTimes(1);
    expect(updateProfileSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1', displayName: 'Jane Doe' }),
    );
    expect(updateDisplayNameSpy).toHaveBeenCalledWith('Jane Doe');
    expect(navigateByUrlSpy).toHaveBeenCalledWith('onboarding/photo');
  });

  it('should not save or navigate when the name is invalid', async () => {
    canContinue = false;
    const fixture = setup();

    await fixture.componentInstance.continue();

    expect(updateProfileSpy).not.toHaveBeenCalled();
    expect(navigateByUrlSpy).not.toHaveBeenCalled();
  });

  it('should show an error and not navigate when saving fails', async () => {
    const fixture = setup();
    updateProfileSpy.mockRejectedValueOnce(new Error('network down'));

    await fixture.componentInstance.continue();

    expect(fixture.componentInstance.saveError()).toBeTruthy();
    expect(navigateByUrlSpy).not.toHaveBeenCalled();
  });
});
