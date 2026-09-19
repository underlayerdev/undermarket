import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { onboardingDoneGuard } from './onboarding-done.guard';
import { AuthService } from '../../../application/services/auth.service';
import { UserService } from '../../../application/services/user.service';
import { mockUser } from '../../../domain/user/user.mock';
import type { User } from '../../../domain/user/user.model';

describe('onboardingDoneGuard', () => {
  function setup(currentUser: User | null, waitForProfileResults: (User | null)[]) {
    const authServiceMock = {
      ready: Promise.resolve(),
      currentUser: () => currentUser,
    };
    const waitForProfileSpy = vi.fn();
    for (const result of waitForProfileResults) {
      waitForProfileSpy.mockResolvedValueOnce(result);
    }
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

  it('should redirect to /login when signed out', async () => {
    const { createUrlTreeSpy, waitForProfileSpy } = setup(null, []);

    const result = await TestBed.runInInjectionContext(() =>
      onboardingDoneGuard({} as never, {} as never),
    );

    expect(createUrlTreeSpy).toHaveBeenCalledWith(['/login']);
    expect(result).toBe('url-tree');
    expect(waitForProfileSpy).not.toHaveBeenCalled();
  });

  it('should allow activation immediately once the profile is fully onboarded', async () => {
    const { waitForProfileSpy } = setup(mockUser(), [
      mockUser({ onboarded: true, displayName: 'Jane' }),
    ]);

    const result = await TestBed.runInInjectionContext(() =>
      onboardingDoneGuard({} as never, {} as never),
    );

    expect(result).toBe(true);
    expect(waitForProfileSpy).toHaveBeenCalledTimes(1);
  });

  it('should poll until the server-side flip lands', async () => {
    const { waitForProfileSpy } = setup(mockUser(), [
      mockUser({ onboarded: false, displayName: 'Jane' }),
      mockUser({ onboarded: false, displayName: 'Jane' }),
      mockUser({ onboarded: true, displayName: 'Jane' }),
    ]);

    const result = await TestBed.runInInjectionContext(() =>
      onboardingDoneGuard({} as never, {} as never),
    );

    expect(result).toBe(true);
    expect(waitForProfileSpy).toHaveBeenCalledTimes(3);
  });

  it('should redirect back to the name step after exhausting every attempt', async () => {
    const { createUrlTreeSpy, waitForProfileSpy } = setup(
      mockUser(),
      Array.from({ length: 5 }, () => mockUser({ onboarded: false, displayName: '' })),
    );

    const result = await TestBed.runInInjectionContext(() =>
      onboardingDoneGuard({} as never, {} as never),
    );

    expect(createUrlTreeSpy).toHaveBeenCalledWith(['/onboarding/name']);
    expect(result).toBe('url-tree');
    expect(waitForProfileSpy).toHaveBeenCalledTimes(5);
  });
});
