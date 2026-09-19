import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { onboardingGuard } from './onboarding.guard';
import { AuthService } from '../../../application/services/auth.service';
import { UserService } from '../../../application/services/user.service';
import { mockUser } from '../../../domain/user/user.mock';
import type { User } from '../../../domain/user/user.model';

describe('onboardingGuard', () => {
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

    return { createUrlTreeSpy };
  }

  it('should redirect to /login when signed out', async () => {
    const { createUrlTreeSpy } = setup(null);

    const result = await TestBed.runInInjectionContext(() =>
      onboardingGuard({} as never, {} as never),
    );

    expect(createUrlTreeSpy).toHaveBeenCalledWith(['/login']);
    expect(result).toBe('url-tree');
  });

  it('should redirect to /home when already fully onboarded', async () => {
    const { createUrlTreeSpy } = setup(mockUser({ onboarded: true, displayName: 'Jane' }));

    const result = await TestBed.runInInjectionContext(() =>
      onboardingGuard({} as never, {} as never),
    );

    expect(createUrlTreeSpy).toHaveBeenCalledWith(['/home']);
    expect(result).toBe('url-tree');
  });

  it('should allow activation when signed in but not yet onboarded', async () => {
    setup(mockUser({ onboarded: false }));

    const result = await TestBed.runInInjectionContext(() =>
      onboardingGuard({} as never, {} as never),
    );

    expect(result).toBe(true);
  });
});
