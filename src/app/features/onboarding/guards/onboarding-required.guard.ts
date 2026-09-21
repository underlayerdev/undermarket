import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../../../application/services/auth.service';
import { UserService } from '../../../application/services/user.service';
import { isFullyOnboarded } from '../../../domain/user/user-display';
import { ONBOARDING_ROUTES } from '../onboarding.config';

// canActivateChild on AppLayoutComponent — redirects any signed-in,
// not-yet-onboarded user to /onboarding regardless of which URL they hit
// (deep link, back button, typed URL). Guests pass through untouched;
// existing per-route authGuard/public routes are unaffected.
export const onboardingRequiredGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const userService = inject(UserService);
  const router = inject(Router);

  await authService.ready;

  const user = authService.currentUser();
  if (!user) return true;

  const profile = await userService.waitForProfile(user.id);
  return isFullyOnboarded(profile) ? true : router.createUrlTree([`/${ONBOARDING_ROUTES.welcome}`]);
};
