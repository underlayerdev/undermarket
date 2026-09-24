import { Component } from '@angular/core';
import { SkeletonComponent } from '@underlayerdev/ui';

@Component({
  selector: 'um-listing-detail-loading',
  templateUrl: './listing-detail-loading.html',
  styleUrl: './listing-detail-loading.scss',
  imports: [SkeletonComponent],
})
export class ListingDetailLoadingComponent {
  // Card count for the similar-items placeholder row. Kept lower than the
  // carousel's own widest breakpoint (5 per page): the row doesn't scroll, and
  // extra cards past what's on screen would just be wasted skeleton nodes.
  protected readonly similarCards = [0, 1, 2, 3];
}
