import { IMAGE_LOADER } from '@angular/common';
import type { ImageLoaderConfig } from '@angular/common';
import type { Provider } from '@angular/core';

// Angular's own provideCloudinaryLoader() assumes `ngSrc` is a bare
// public-id that it prefixes with a base path — our stored imageUrls are
// already full secure_urls from Cloudinary's upload API (see
// cloudinary-image-storage.ts), so that loader would double-prefix and
// break the URL. This rewrites the existing full URL in place instead,
// inserting a width + auto quality/format transformation right after
// "/upload/". NgOptimizedImage's `fill` mode has no fixed width to pass
// through, so every image is capped at the same 800px — still a real win
// over serving the original, uncapped upload.
export function provideCloudinaryImageLoader(): Provider {
  return {
    provide: IMAGE_LOADER,
    useValue: (config: ImageLoaderConfig) =>
      config.src.replace('/upload/', `/upload/w_${config.width ?? 800},q_auto,f_auto/`),
  };
}
