import { Routes } from '@angular/router';
import { settingsIndexGuard } from './settings-index/settings-index.guard';

export const settingsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./settings').then((m) => m.SettingsComponent),
    children: [
      {
        path: '',
        canActivate: [settingsIndexGuard],
        loadComponent: () =>
          import('./settings-index/settings-index').then((m) => m.SettingsIndexComponent),
      },
      {
        path: 'account',
        loadComponent: () =>
          import('./account/settings-account').then((m) => m.SettingsAccountComponent),
      },
      {
        path: 'display',
        loadComponent: () =>
          import('./display/settings-display').then((m) => m.SettingsDisplayComponent),
      },
      {
        path: 'mercado-libre',
        loadComponent: () =>
          import('./mercado-libre/settings-mercado-libre').then(
            (m) => m.SettingsMercadoLibreComponent,
          ),
      },
    ],
  },
];
