import { Component, inject, input } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Options } from '@splidejs/splide';
import { ImageNotFoundComponent, ImageNotFoundDirective } from '@underlayerdev/ui';
import { CarouselComponent, CarouselItemComponent } from '@underlayerdev/ui/carousel';
import { ImageLightboxService } from '../../../../shared/image-lightbox/image-lightbox.service';

@Component({
  selector: 'um-listing-detail-images',
  templateUrl: 'listing-detail-images.html',
  styleUrl: 'listing-detail-images.scss',
  imports: [
    CarouselComponent,
    CarouselItemComponent,
    ImageNotFoundComponent,
    ImageNotFoundDirective,
  ],
})
export class ListingDetailImagesComponent {
  readonly imageUrls = input.required<string[]>();

  readonly carouselOptions: Options = {
    autoplay: false,
  };

  private readonly transloco = inject(TranslocoService);
  private readonly imageLightboxService = inject(ImageLightboxService);

  protected openLightbox(index: number): void {
    void this.imageLightboxService.open(this.imageUrls(), index, (i) => this.photoAltText(i));
  }

  protected photoAltText(index: number): string {
    return this.transloco.translate('listingDetail.photoAlt', { photoNumber: index + 1 });
  }
}
