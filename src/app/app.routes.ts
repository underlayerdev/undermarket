import { Routes } from '@angular/router';
import { AppLayoutComponent } from './layouts/app-layout/app-layout';
import { PublicLayoutComponent } from './layouts/public-layout/public-layout';
import { authGuard } from './features/auth/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  {
    path: '',
    component: PublicLayoutComponent,
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },

  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'home',
        loadComponent: () => import('./features/home/home').then((m) => m.HomeComponent),
      },
      {
        path: 'search',
        loadComponent: () => import('./features/search/search').then((m) => m.SearchComponent),
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile').then((m) => m.ProfileComponent),
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings').then((m) => m.SettingsComponent),
      },
      {
        path: 'listings/new',
        loadComponent: () => import('./features/listings/new/new-listing').then((m) => m.NewListingComponent),
      },
      {
        path: 'listings/:slug',
        loadComponent: () =>
          import('./features/listings/detail/listing-detail').then((m) => m.ListingDetailComponent),
      },
    ],
  },
];
