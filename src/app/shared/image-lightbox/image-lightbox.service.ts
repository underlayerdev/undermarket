import { DestroyRef, inject, Injectable } from '@angular/core';
import type PhotoSwipeLightboxType from 'photoswipe/lightbox';
import type { DataSource } from 'photoswipe';

function loadImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    // A single broken photo shouldn't stop the whole gallery from opening.
    image.onerror = () => resolve({ width: 0, height: 0 });
    image.src = src;
  });
}

// Renders its own full-screen overlay directly onto document.body, entirely
// outside Angular's component tree — a service with no template, rather than
// a component, since there's nothing for Angular to render.
@Injectable({ providedIn: 'root' })
export class ImageLightboxService {
  private lightbox: PhotoSwipeLightboxType | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.lightbox?.destroy());
  }

  async open(
    images: string[],
    startIndex: number,
    altText?: (index: number) => string,
  ): Promise<void> {
    const sizes = await Promise.all(images.map(loadImageSize));
    const dataSource: DataSource = images.map((src, index) => ({
      src,
      width: sizes[index].width,
      height: sizes[index].height,
      alt: altText?.(index) ?? '',
    }));

    await this.ensureLightbox();
    this.lightbox?.loadAndOpen(startIndex, dataSource);
  }

  private async ensureLightbox(): Promise<void> {
    if (this.lightbox) return;

    const { default: PhotoSwipeLightbox } = await import('photoswipe/lightbox');
    this.lightbox = new PhotoSwipeLightbox({
      pswpModule: () => import('photoswipe'),
    });
    this.lightbox.init();
  }
}
