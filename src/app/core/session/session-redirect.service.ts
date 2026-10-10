import { effect, inject, Service, untracked } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../../application/services/auth.service';
import { authGuard } from '../../features/auth/guards/auth.guard';

function requiresAuth(route: ActivatedRouteSnapshot): boolean {
  return (
    !!route.routeConfig?.canActivate?.includes(authGuard) ||
    route.children.some((child) => requiresAuth(child))
  );
}

/**
 * Sends the user to the login screen when their session disappears while
 * they're on a page that needs one — e.g. they cleared the site data, or
 * signed out in another tab. Firebase Auth notices the stored session going
 * away on its own (it polls its storage) and signs the user out in memory,
 * but guards only run on navigation, so without this the page would sit there
 * half signed-out.
 *
 * Pages that work for guests (home, listings, public profiles) are left
 * alone, and an explicit sign-out already navigates itself.
 */
@Service()
export class SessionRedirectService {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private wasSignedIn = false;

  constructor() {
    effect(() => {
      const isSignedIn = this.authService.currentUser() !== null;
      untracked(() => {
        const lostSession = this.wasSignedIn && !isSignedIn;
        this.wasSignedIn = isSignedIn;
        if (lostSession && requiresAuth(this.router.routerState.snapshot.root)) {
          void this.router.navigateByUrl('/login');
        }
      });
    });
  }
}
