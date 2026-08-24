import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

// Desktop's split-view sidebar+outlet layout always wants a sub-route
// selected, so bare /settings redirects to /settings/account there. Mobile's
// drill-in list needs /settings to be its own reachable screen instead —
// this guard is what makes the redirect viewport-conditional, since a static
// route redirectTo has no way to see the viewport width.
export const settingsIndexGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (window.innerWidth >= 1024) {
    return router.createUrlTree(['/settings/account']);
  }
  return true;
};
