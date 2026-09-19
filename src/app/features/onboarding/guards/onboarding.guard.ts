import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../../../application/services/auth.service';
import { UserService } from '../../../application/services/user.service';
import { isFullyOnboarded } from '../../../domain/user/user-display';

// canActivate on the /onboarding route itself — the inverse of
// onboardingRequiredGuard. Signed out -> /login. Already onboarded -> /home,
// so no one can revisit the wizard once done.
export const onboardingGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const userService = inject(UserService);
  const router = inject(Router);

  await authService.ready;

  const user = authService.currentUser();
  if (!user) return router.createUrlTree(['/login']);

  const profile = await userService.waitForProfile(user.id);
  return isFullyOnboarded(profile) ? router.createUrlTree(['/home']) : true;
};
