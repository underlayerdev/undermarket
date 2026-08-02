import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FooterComponent } from '@underlayerdev/ui';

export type FooterVariant = 'minimal' | 'full';

@Component({
  selector: 'um-footer',
  templateUrl: './footer.html',
  imports: [FooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteFooterComponent {
  // Type of footer. Minimal footer is used in auth to show a limited footer.
  variant = input('full');

  socialLinks: [{ url: string; icon: string }] = [{ url: 'https://x.com/underlayerdev', icon: 'X' }];
}
