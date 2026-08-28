import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { ButtonComponent, StatusComponent } from '@underlayerdev/ui';

export type ListingDetailErrorType = 'not-found' | 'generic';

@Component({
  selector: 'um-listing-detail-error',
  imports: [ButtonComponent, RouterLink, StatusComponent, TranslocoDirective],
  templateUrl: './listing-detail-error.html',
  styles: `
    .listing-detail-error {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
  `,
})
export class ListingDetailErrorComponent {
  readonly errorType = input<ListingDetailErrorType>('generic');
  readonly retry = output<void>();
}
