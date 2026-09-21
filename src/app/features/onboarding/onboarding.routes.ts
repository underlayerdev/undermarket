import { Routes } from '@angular/router';
import { onboardingDoneGuard } from './guards/onboarding-done.guard';
import { ONBOARDING_PATHS } from './onboarding.config';

// Paths come from ONBOARDING_PATHS so the URLs mounted here and the URLs
// navigated to in ONBOARDING_STEPS can't drift apart.
export const onboardingRoutes: Routes = [
  {
    path: ONBOARDING_PATHS.welcome,
    pathMatch: 'full',
    loadComponent: () =>
      import('./onboarding-welcome/onboarding-welcome').then((m) => m.OnboardingWelcomeComponent),
  },
  {
    // The three data-entry steps share the stepper/footer chrome.
    path: '',
    loadComponent: () => import('./onboarding-shell').then((m) => m.OnboardingShellComponent),
    children: [
      {
        path: ONBOARDING_PATHS.name,
        loadComponent: () =>
          import('./onboarding-name/onboarding-name').then((m) => m.OnboardingNameComponent),
      },
      {
        path: ONBOARDING_PATHS.photo,
        loadComponent: () =>
          import('./onboarding-avatar/onboarding-avatar').then((m) => m.OnboardingAvatarComponent),
      },
      {
        path: ONBOARDING_PATHS.location,
        loadComponent: () =>
          import('./onboarding-location/onboarding-location').then(
            (m) => m.OnboardingLocationComponent,
          ),
      },
    ],
  },
  {
    // Sibling of the shell (own navbar/layout, no stepper) rather than a
    // fourth shell child — it's a congratulations screen, not another input
    // step, so showing it under a "3 of 3" stepper would be misleading.
    path: ONBOARDING_PATHS.done,
    canActivate: [onboardingDoneGuard],
    loadComponent: () =>
      import('./onboarding-done/onboarding-done').then((m) => m.OnboardingDoneComponent),
  },
];
