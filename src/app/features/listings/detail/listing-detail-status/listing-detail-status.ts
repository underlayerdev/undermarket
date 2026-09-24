import { Component, input } from '@angular/core';
import { PillComponent } from '@underlayerdev/ui';
import { Listing } from '../../../../domain/listing/listing.model';
import { TranslocoDirective } from '@jsverse/transloco';

@Component({
  selector: 'um-listing-detail-status',
  template: `
    <ng-container *transloco="let t">
      @if (item().status === 'sold') {
        <ul-pill theme="fill-red" variant="read-only" size="sm">
          {{ t('listingDetail.sold') }}
        </ul-pill>
      } @else if (item().status === 'draft') {
        <ul-pill theme="outline-white" variant="read-only" size="sm">
          {{ t('listingDetail.draft') }}
        </ul-pill>
      } @else {
        <ul-pill theme="transparent-green" variant="read-only" size="sm">
          {{ t('listingDetail.available') }}
        </ul-pill>
      }
    </ng-container>
  `,
  imports: [PillComponent, TranslocoDirective],
})
export class ListingDetailStatusComponent {
  item = input.required<Listing>();
}
