import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import type { Listing } from '../../domain/models/listing.model';

const SITE_NAME = 'Undermarket';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);

  setPage(title: string, description?: string): void {
    const fullTitle = title ? `${title} - ${SITE_NAME}` : SITE_NAME;
    this.titleService.setTitle(fullTitle);

    if (description) {
      this.metaService.updateTag({ name: 'description', content: description });
    }
  }

  setListing(listing: Listing): void {
    const title = `${listing.title} - ${SITE_NAME}`;
    this.titleService.setTitle(title);
    this.metaService.updateTag({
      name: 'description',
      content: `${listing.description.slice(0, 155)}...`,
    });
  }
}
