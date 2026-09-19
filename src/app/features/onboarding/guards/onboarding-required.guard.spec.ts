import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { onboardingRequiredGuard } from './onboarding-required.guard';
import { AuthService } from '../../../application/services/auth.service';
import { UserService } from '../../../application/services/user.service';
import { mockUser } from '../../../domain/user/user.mock';
import type { User } from '../../../domain/user/user.model';

describe('onboardingRequiredGuard', () => {
  function setup(currentUser: User | null, waitForProfileResult: User | null = currentUser) {
    const authServiceMock = {
      ready: Promise.resolve(),
      currentUser: () => currentUser,
    };
    const waitForProfileSpy = vi.fn().mockResolvedValue(waitForProfileResult);
    const userServiceMock = { waitForProfile: waitForProfileSpy };
    const createUrlTreeSpy = vi.fn().mockReturnValue('url-tree');
    const routerMock = { createUrlTree: createUrlTreeSpy };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });

    return { createUrlTreeSpy, waitForProfileSpy };
  }

  it('should allow guests through without checking a profile', async () => {
    const { waitForProfileSpy } = setup(null);

    const result = await TestBed.runInInjectionContext(() =>
      onboardingRequiredGuard({} as never, {} as never),
    );

    expect(result).toBe(true);
    expect(waitForProfileSpy).not.toHaveBeenCalled();
  });

  it('should allow a fully onboarded user through', async () => {
    setup(mockUser({ onboarded: true, displayName: 'Jane' }));

    const result = await TestBed.runInInjectionContext(() =>
      onboardingRequiredGuard({} as never, {} as never),
    );

    expect(result).toBe(true);
  });

  it('should redirect to /onboarding when the profile is not onboarded', async () => {
    const { createUrlTreeSpy } = setup(mockUser({ onboarded: false }));

    const result = await TestBed.runInInjectionContext(() =>
      onboardingRequiredGuard({} as never, {} as never),
    );

    expect(createUrlTreeSpy).toHaveBeenCalledWith(['/onboarding']);
    expect(result).toBe('url-tree');
  });

  it('should redirect to /onboarding when onboarded is true but the display name is blank', async () => {
    const { createUrlTreeSpy } = setup(mockUser({ onboarded: true, displayName: '' }));

    const result = await TestBed.runInInjectionContext(() =>
      onboardingRequiredGuard({} as never, {} as never),
    );

    expect(createUrlTreeSpy).toHaveBeenCalledWith(['/onboarding']);
    expect(result).toBe('url-tree');
  });
});
