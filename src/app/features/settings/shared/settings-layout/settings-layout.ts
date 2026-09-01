import { Component, input, ViewEncapsulation } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { ButtonComponent, IconComponent } from '@underlayerdev/ui';

@Component({
  selector: 'um-settings-layout',
  templateUrl: './settings-layout.html',
  styleUrl: './settings-layout.scss',
  imports: [ButtonComponent, IconComponent, RouterLink, TranslocoDirective],
  encapsulation: ViewEncapsulation.None,
})
export class SettingsLayoutComponent {
  readonly title = input('');
}
