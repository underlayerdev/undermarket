import { Routes } from '@angular/router';
import { onboardingDoneGuard } from './guards/onboarding-done.guard';

export const onboardingPath = 'onboarding';
export const onboardingNamePath = `${onboardingPath}/name`;
export const onboardingPhotoPath = `${onboardingPath}/photo`;
export const onboardingLocationPath = `${onboardingPath}/location`;
export const onboardingDonePath = `${onboardingPath}/done`;

export const onboardingRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./onboarding-welcome/onboarding-welcome').then((m) => m.OnboardingWelcomeComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./onboarding-shell').then((m) => m.OnboardingShellComponent),
    children: [
      {
        path: 'name',
        loadComponent: () =>
          import('./onboarding-name/onboarding-name').then((m) => m.OnboardingNameComponent),
      },
      {
        path: 'photo',
        loadComponent: () =>
          import('./onboarding-avatar/onboarding-avatar').then((m) => m.OnboardingAvatarComponent),
      },
      {
        path: 'location',
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
    path: 'done',
    canActivate: [onboardingDoneGuard],
    loadComponent: () =>
      import('./onboarding-done/onboarding-done').then((m) => m.OnboardingDoneComponent),
  },
];
