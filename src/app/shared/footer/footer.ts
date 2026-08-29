import { Component, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { FooterComponent } from '@underlayerdev/ui';

export type FooterVariant = 'minimal' | 'full';

@Component({
  selector: 'um-footer',
  templateUrl: './footer.html',
  imports: [FooterComponent, TranslocoDirective],
})
export class SiteFooterComponent {
  // Type of footer. Minimal footer is used in auth to show a limited footer.
  variant = input('full');

  socialLinks: [{ url: string; icon: string }] = [
    { url: 'https://x.com/underlayerdev', icon: 'X' },
  ];
}
