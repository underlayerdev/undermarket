import { Routes } from '@angular/router';
import { AuthLayoutComponent } from './auth-layout';
import { guestGuard } from './guards/guest.guard';

export const authRoutes: Routes = [
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      {
        path: 'login',
        loadComponent: () => import('./login/login').then((m) => m.LoginComponent),
        canActivate: [guestGuard],
      },
      {
        path: 'register',
        loadComponent: () => import('./register/register').then((m) => m.RegisterComponent),
        canActivate: [guestGuard],
      },
      {
        path: 'forgot-password',
        loadComponent: () => import('./forgot-password/forgot-password').then((m) => m.ForgotPasswordComponent),
        canActivate: [guestGuard],
      },
      {
        path: 'reset-password',
        loadComponent: () => import('./reset-password/reset-password').then((m) => m.ResetPasswordComponent),
      },
    ],
  },
];
