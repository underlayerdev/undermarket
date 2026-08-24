import { ChangeDetectionStrategy, Component } from '@angular/core';
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
];

@Component({
  selector: 'um-settings-index',
  standalone: true,
  imports: [RouterLink, IconComponent, TranslocoDirective],
  templateUrl: './settings-index.html',
  styleUrl: './settings-index.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsIndexComponent {
  readonly navItems = SETTINGS_INDEX_ITEMS;
}
