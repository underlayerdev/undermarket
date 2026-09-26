import { Component, inject, input } from '@angular/core';
import { ButtonComponent, IconComponent } from '@underlayerdev/ui';
import {
  ListingActionResult,
  ListingDetailActionsComponent,
} from '../listing-detail-actions/listing-detail-actions';
import { TranslocoDirective } from '@jsverse/transloco';
import { ListingDetailStore } from '../listing-detail.store';
import { Location } from '@angular/common';

// The back button + mobile "..." action menu that float over the gallery
// photo — split out of ListingDetailComponent so the scroll-backdrop bar
// wrapping this (see listing-detail.scss's .listing-detail__header) has a
// single thing to size itself around, rather than two independently
// `position: fixed` siblings. Both `deleteRequested`/`actionResult` from the
// nested actions menu write straight to the shared store rather than
// round-tripping through an `@Output()` to `ListingDetailComponent` — see
// ListingDetailStore's own class doc for why those two signals live there.
@Component({
  selector: 'um-listing-detail-header',
  templateUrl: 'listing-detail-header.html',
  styleUrl: 'listing-detail-header.scss',
  imports: [TranslocoDirective, ButtonComponent, IconComponent, ListingDetailActionsComponent],
})
export class ListingDetailHeaderComponent {
  readonly showBackground = input(false);

  private readonly location = inject(Location);
  protected readonly store = inject(ListingDetailStore);

  protected openDeleteModal(): void {
    this.store.showDeleteModal.set(true);
  }

  protected onActionResult(result: ListingActionResult): void {
    this.store.resultModal.set(result);
  }

  goBack(): void {
    this.location.back();
  }
}
