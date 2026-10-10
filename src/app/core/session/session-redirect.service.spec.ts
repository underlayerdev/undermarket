import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, type Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { SessionRedirectService } from './session-redirect.service';
import { AuthService } from '../../application/services/auth.service';
import { authGuard } from '../../features/auth/guards/auth.guard';
import type { AuthUser } from '../../domain/user/user.model';

const user: AuthUser = { id: 'user-1', providerId: 'password' };

const routes: Routes = [
  { path: 'login', children: [] },
  { path: 'home', children: [] },
  { path: 'settings', canActivate: [authGuard], children: [{ path: 'profile', children: [] }] },
];

describe('SessionRedirectService', () => {
  const currentUser = signal<AuthUser | null>(null);

  async function setup(startAt: string, signedIn: AuthUser | null = user) {
    currentUser.set(signedIn);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: AuthService, useValue: { ready: Promise.resolve(), currentUser } },
      ],
    });
    TestBed.inject(SessionRedirectService);
    TestBed.tick();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(startAt);
    return TestBed.inject(Router);
  }

  async function endSession(router: Router): Promise<void> {
    currentUser.set(null);
    TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve));
    expect(router.navigated).toBe(true);
  }

  it('should send the user to the login screen when the session ends on a protected page', async () => {
    const router = await setup('/settings/profile');

    await endSession(router);

    expect(router.url).toBe('/login');
  });

  it('should leave the user on a page that also works for guests', async () => {
    const router = await setup('/home');

    await endSession(router);

    expect(router.url).toBe('/home');
  });

  it('should not redirect a guest who was never signed in', async () => {
    const router = await setup('/home', null);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');

    TestBed.tick();

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('should redirect again after signing back in and losing the session a second time', async () => {
    const router = await setup('/settings/profile');
    await endSession(router);
    expect(router.url).toBe('/login');

    currentUser.set(user);
    TestBed.tick();
    await router.navigateByUrl('/settings');
    await endSession(router);

    expect(router.url).toBe('/login');
  });
});
