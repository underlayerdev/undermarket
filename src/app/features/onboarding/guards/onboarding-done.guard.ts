import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../../../application/services/auth.service';
import { UserService } from '../../../application/services/user.service';
import { isFullyOnboarded } from '../../../domain/user/user-display';
import { ONBOARDING_ROUTES } from '../onboarding.config';

const POLL_ATTEMPTS = 5;
const POLL_DELAY_MS = 400;

// canActivate on /onboarding/done. `onboarded` flips server-side,
// asynchronously, shortly after the name step's write (see
// functions/src/users/on-update.ts) — waitForProfile() never trusts a cached
// not-yet-onboarded profile, but a single check can still land a moment
// before that write lands. Polling a few times covers the normal case
// (photo/location give it plenty of time) without a single early check
// bouncing a legitimately-finishing user back into the flow. Landing here
// without having gone through the flow at all (direct link, no valid
// displayName ever saved) exhausts every attempt and is sent back to start.
export const onboardingDoneGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const userService = inject(UserService);
  const router = inject(Router);

  await authService.ready;

  const user = authService.currentUser();
  if (!user) return router.createUrlTree(['/login']);

  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
    const profile = await userService.waitForProfile(user.id);
    if (isFullyOnboarded(profile)) return true;
    if (attempt < POLL_ATTEMPTS - 1) {
      await new Promise((resolve) => setTimeout(resolve, POLL_DELAY_MS));
    }
  }
  return router.createUrlTree([`/${ONBOARDING_ROUTES.name}`]);
};
