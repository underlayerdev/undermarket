import { inject, Injectable, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { IMAGE_STORAGE, LISTING_REPOSITORY } from '../../core/configuration/tokens';
import type { Listing, ListingId } from '../../domain/listing/listing.model';
import type { ListingSearchFilters } from '../../domain/listing/listing.repository';
import { validateNewListing } from '../../domain/listing/listing.validator';
import type { NewListingInput } from '../../domain/listing/listing.validator';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ListingService {
  private readonly listingRepository = inject(LISTING_REPOSITORY);
  private readonly imageStorage = inject(IMAGE_STORAGE);
  private readonly authService = inject(AuthService);
  private readonly transloco = inject(TranslocoService);

  readonly listings = signal<Listing[]>([]);

  async loadLatest(): Promise<void> {
    const result = await this.listingRepository.getLatest();
    this.listings.set(result);
  }

  async search(filters: ListingSearchFilters): Promise<void> {
    const result = await this.listingRepository.search(filters);
    this.listings.set(result);
  }

  // firestore.rules requires a new listing's imageUrls to start empty, so
  // images are uploaded and attached in a follow-up update after create().
  async create(data: NewListingInput, images: File[] = []): Promise<Listing> {
    const currentUser = this.authService.currentUser();
    if (!currentUser)
      throw new Error(this.transloco.translate('listingService.mustBeSignedIn'));
    if (data.ownerId !== currentUser.id) {
      throw new Error(this.transloco.translate('listingService.ownAccountOnly'));
    }

    const validationError = validateNewListing(data, this.transloco);
    if (validationError) throw new Error(validationError);

    const listing = await this.listingRepository.create({
      ...data,
      currency: data.currency as Listing['currency'],
      category: data.category as Listing['category'],
      imageUrls: [],
    });

    if (!images.length) return listing;

    const imageUrls = await Promise.all(images.map((file) => this.imageStorage.upload(file)));
    const updated = { ...listing, imageUrls };
    await this.listingRepository.update(updated);
    return updated;
  }

  async update(listing: Listing): Promise<void> {
    await this.listingRepository.update(listing);
  }

  async delete(id: ListingId): Promise<void> {
    await this.listingRepository.delete(id);
  }
}
