import { Component, computed, input } from '@angular/core';
import { SkeletonComponent } from '@underlayerdev/ui';

@Component({
  selector: 'um-listing-list-skeleton',
  template: `
    <div class="listing-list-skeleton-container" role="status" aria-label="Loading listings">
      @for (row of rows(); track $index) {
        <div class="listing-list-skeleton__item">
          <ul-skeleton variant="rect" height="76px" width="64px" [show]="true" />
          <div class="listing-list-skeleton__item-information">
            <ul-skeleton variant="text" height="76px" [lines]="3" [show]="true" />
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './listing-list-skeleton.scss',
  imports: [SkeletonComponent],
})
export class ListingListSkeletonComponent {
  /** Number of placeholder rows to render while the real list is loading. */
  listingsAmount = input(4);

  protected readonly rows = computed(() =>
    Array.from({ length: Math.max(0, this.listingsAmount()) }),
  );
}
