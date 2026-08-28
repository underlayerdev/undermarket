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
    children: [
      {
        path: 'home',
        loadComponent: () => import('./features/home/home').then((m) => m.HomeComponent),
      },
      {
        path: 'search',
        canActivate: [authGuard],
        loadComponent: () => import('./features/search/search').then((m) => m.SearchComponent),
      },
      {
        path: 'discover',
        loadComponent: () =>
          import('./features/discover/discover').then((m) => m.DiscoverComponent),
      },
      {
        path: 'profile',
        canActivate: [authGuard],
        loadComponent: () => import('./features/profile/profile').then((m) => m.ProfileComponent),
      },
      {
        path: 'settings',
        canActivate: [authGuard],
        loadChildren: () =>
          import('./features/settings/settings.routes').then((m) => m.settingsRoutes),
      },
      {
        path: 'listings/new',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/listings/new/new-listing').then((m) => m.NewListingComponent),
      },
      {
        // Public: anyone can view a listing. Ownership-only actions (edit/delete)
        // are gated in the component itself via AuthService.currentUser().
        path: 'listings/:slug',
        loadComponent: () =>
          import('./features/listings/detail/listing-detail').then((m) => m.ListingDetailComponent),
      },
    ],
  },
];
