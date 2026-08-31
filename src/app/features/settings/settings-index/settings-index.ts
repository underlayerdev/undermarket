import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { IconComponent } from '@underlayerdev/ui';

interface SettingsIndexItem {
  path: string;
  labelKey: string;
  subtitleKey: string;
}

const SETTINGS_INDEX_ITEMS: SettingsIndexItem[] = [
  { path: 'account', labelKey: 'settings.account', subtitleKey: 'settings.accountSubtitle' },
  { path: 'display', labelKey: 'settings.display', subtitleKey: 'settings.displaySubtitle' },
  {
    path: 'mercado-libre',
    labelKey: 'settings.mercadoLibre',
    subtitleKey: 'settings.mercadoLibreSubtitle',
  },
];

@Component({
  selector: 'um-settings-index',
  imports: [RouterLink, IconComponent, TranslocoDirective],
  templateUrl: './settings-index.html',
  styleUrl: './settings-index.scss',
})
export class SettingsIndexComponent {
  readonly navItems = SETTINGS_INDEX_ITEMS;
}
