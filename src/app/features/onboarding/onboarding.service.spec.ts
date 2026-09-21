import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../../application/services/auth.service';
import { ErrorService } from '../../application/services/error.service';
import { UserService } from '../../application/services/user.service';
import { mockUser } from '../../domain/user/user.mock';
import type { User } from '../../domain/user/user.model';
import { getTranslocoTestingModule } from '../../../testing/transloco-testing';
import { OnboardingService } from './onboarding.service';

describe('OnboardingService', () => {
  let profile: User | null;

  function setup() {
    const navigateByUrl = vi.fn().mockResolvedValue(true);
    const updateProfile = vi.fn().mockResolvedValue(undefined);
    const updateDisplayName = vi.fn().mockResolvedValue(undefined);
    const updatePhotoUrl = vi.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule()],
      providers: [
        { provide: Router, useValue: { navigateByUrl } },
        { provide: UserService, useValue: { profile: () => profile, updateProfile } },
        {
          provide: AuthService,
          useValue: { updateDisplayName, updatePhotoUrl, currentUser: () => profile },
        },
        { provide: ErrorService, useValue: { toUserMessage: () => 'Something went wrong.' } },
      ],
    });

    return {
      service: TestBed.inject(OnboardingService),
      navigateByUrl,
      updateProfile,
      updateDisplayName,
      updatePhotoUrl,
    };
  }

  beforeEach(() => {
    profile = mockUser({ id: 'user-1', displayName: 'Jane', photoUrl: undefined });
  });

  describe('config-driven presentation', () => {
    it('should label Continue from the active step', () => {
      const { service } = setup();

      service.startStep({ id: 'welcome' });
      expect(service.continueLabel()).toBe('Get started');

      service.startStep({ id: 'location' });
      expect(service.continueLabel()).toBe('Finish');
    });

    it.each([
      ['welcome', false],
      ['name', false],
      ['photo', true],
      ['location', true],
      ['done', false],
    ] as const)('should show a Back button on %s: %s', (id, expected) => {
      const { service } = setup();

      service.startStep({ id });

      expect(service.showBack()).toBe(expected);
    });

    it('should report the stepper position of the data-entry steps and none for the rest', () => {
      const { service } = setup();

      service.startStep({ id: 'name' });
      expect(service.stepperPosition()).toBe(1);

      service.startStep({ id: 'location' });
      expect(service.stepperPosition()).toBe(3);

      // Welcome and done are full-page screens outside the stepper.
      service.startStep({ id: 'welcome' });
      expect(service.stepperPosition()).toBe(0);
    });

    it('should derive the stepper length and labels from the config', () => {
      const { service } = setup();

      expect(service.totalSteps).toBe(3);
      expect(service.stepperLabels()).toEqual(['Name', 'Photo', 'Location']);
    });
  });

  describe('continue', () => {
    it('should advance to the route the config names, without writing anything', async () => {
      const { service, navigateByUrl, updateProfile } = setup();
      service.startStep({ id: 'welcome' });

      await service.continue();

      expect(navigateByUrl).toHaveBeenCalledWith('onboarding/name');
      expect(updateProfile).not.toHaveBeenCalled();
    });

    it('should save a changed field to Firestore and Auth, then advance', async () => {
      const { service, navigateByUrl, updateProfile, updateDisplayName } = setup();
      service.startStep({ id: 'name', changes: () => ({ displayName: 'Jane Doe' }) });

      await service.continue();

      // Exact equality, not objectContaining: proves no other field of the
      // profile was touched — `onboarded` in particular.
      expect(updateProfile).toHaveBeenCalledWith({ ...profile, displayName: 'Jane Doe' });
      expect(updateDisplayName).toHaveBeenCalledWith('Jane Doe');
      expect(navigateByUrl).toHaveBeenCalledWith('onboarding/photo');
    });

    it('should write nothing when the step collected a value that already matches the profile', async () => {
      const { service, navigateByUrl, updateProfile, updateDisplayName } = setup();
      // 'Jane' is what the profile already holds.
      service.startStep({ id: 'name', changes: () => ({ displayName: 'Jane' }) });

      await service.continue();

      expect(updateProfile).not.toHaveBeenCalled();
      expect(updateDisplayName).not.toHaveBeenCalled();
      expect(navigateByUrl).toHaveBeenCalledWith('onboarding/photo');
    });

    it('should write nothing when a skippable step collected nothing at all', async () => {
      const { service, navigateByUrl, updateProfile } = setup();
      service.startStep({ id: 'photo', changes: () => ({}) });

      await service.continue();

      expect(updateProfile).not.toHaveBeenCalled();
      expect(navigateByUrl).toHaveBeenCalledWith('onboarding/location');
    });

    it('should save only the field that actually changed', async () => {
      const { service, updateProfile, updateDisplayName, updatePhotoUrl } = setup();
      service.startStep({
        id: 'photo',
        changes: () => ({ displayName: 'Jane', photoUrl: 'https://cdn/a.jpg' }),
      });

      await service.continue();

      expect(updateProfile).toHaveBeenCalledWith({ ...profile, photoUrl: 'https://cdn/a.jpg' });
      expect(updatePhotoUrl).toHaveBeenCalledWith('https://cdn/a.jpg');
      expect(updateDisplayName).not.toHaveBeenCalled();
    });

    it('should leave the flow out of the last route entirely to the config', async () => {
      const { service, navigateByUrl } = setup();
      service.startStep({ id: 'done' });

      await service.continue();

      expect(navigateByUrl).toHaveBeenCalledWith('home');
    });

    it('should refuse to continue while the step reports it cannot', async () => {
      const { service, navigateByUrl, updateProfile } = setup();
      service.startStep({
        id: 'name',
        canContinue: () => false,
        changes: () => ({ displayName: 'Jane Doe' }),
      });

      await service.continue();

      expect(updateProfile).not.toHaveBeenCalled();
      expect(navigateByUrl).not.toHaveBeenCalled();
    });

    it('should stay on the step and surface a message when the save fails', async () => {
      const { service, navigateByUrl, updateProfile } = setup();
      updateProfile.mockRejectedValueOnce(new Error('network down'));
      service.startStep({ id: 'name', changes: () => ({ displayName: 'Jane Doe' }) });

      await service.continue();

      expect(service.errorMessage()).toBe('Something went wrong.');
      expect(navigateByUrl).not.toHaveBeenCalled();
      expect(service.loading()).toBe(false);
    });

    it('should clear a previous step‘s error when the next step starts', async () => {
      const { service, updateProfile } = setup();
      updateProfile.mockRejectedValueOnce(new Error('network down'));
      service.startStep({ id: 'name', changes: () => ({ displayName: 'Jane Doe' }) });
      await service.continue();
      expect(service.errorMessage()).not.toBeNull();

      service.startStep({ id: 'photo' });

      expect(service.errorMessage()).toBeNull();
    });

    it('should report loading while the save is in flight', async () => {
      const { service, updateProfile } = setup();
      let finishSave!: () => void;
      updateProfile.mockReturnValueOnce(
        new Promise<void>((resolve) => {
          finishSave = () => resolve();
        }),
      );
      service.startStep({ id: 'name', changes: () => ({ displayName: 'Jane Doe' }) });

      const continued = service.continue();
      expect(service.loading()).toBe(true);

      finishSave();
      await continued;

      expect(service.loading()).toBe(false);
    });
  });

  describe('goBack', () => {
    it('should navigate to the route the config names', async () => {
      const { service, navigateByUrl } = setup();
      service.startStep({ id: 'location' });

      await service.goBack();

      expect(navigateByUrl).toHaveBeenCalledWith('onboarding/photo');
    });

    it('should do nothing on a step the config gives no Back route', async () => {
      const { service, navigateByUrl } = setup();
      service.startStep({ id: 'name' });

      await service.goBack();

      expect(navigateByUrl).not.toHaveBeenCalled();
    });
  });
});
