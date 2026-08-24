import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../../../application/services/auth.service';
import type { User } from '../../../domain/user/user.model';

const testUser: User = {
  id: 'u1',
  email: 'test@example.com',
  displayName: 'Test User',
  settings: { language: 'en' },
  providerId: 'password',
  createdAt: new Date(),
};

describe('authGuard', () => {
  function setup(currentUser: User | null) {
    const authServiceMock = {
      ready: Promise.resolve(),
      currentUser: () => currentUser,
    };
    const createUrlTreeSpy = vi.fn().mockReturnValue('url-tree');
    const routerMock = { createUrlTree: createUrlTreeSpy };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });

    return { createUrlTreeSpy };
  }

  it('should allow activation once ready resolves and a user is present', async () => {
    setup(testUser);

    const result = await TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(result).toBe(true);
  });

  it('should redirect to /login once ready resolves and no user is present', async () => {
    const { createUrlTreeSpy } = setup(null);

    const result = await TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(createUrlTreeSpy).toHaveBeenCalledWith(['/login']);
    expect(result).toBe('url-tree');
  });
});
