import { Component } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { ButtonComponent, IconComponent } from '@underlayerdev/ui';

@Component({
  selector: 'um-listing-detail-cta',
  templateUrl: 'listing-detail-cta.html',
  styleUrl: 'listing-detail-cta.scss',
  imports: [TranslocoDirective, ButtonComponent, IconComponent],
})
export class ListingDetailCtaComponent {
  // Both contact channels are deliberately inert for now — the buttons are here
  // so the page's layout and bottom spacing are final, but neither flow exists.
  protected onWhatsAppClick(): void {
    // TODO: open https://wa.me/<number> once sellers can save a phone number.
  }

  protected onMessageClick(): void {
    // TODO: open the conversation with the seller once in-app messaging exists.
  }
}
