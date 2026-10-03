import { inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { IMAGE_STORAGE, LISTING_REPOSITORY } from '../../core/configuration/tokens';
import type { Listing, ListingId } from '../../domain/listing/listing.model';
import { validateNewListing } from '../../domain/listing/listing.validator';
import type { NewListingInput } from '../../domain/listing/listing.validator';
import { AuthService } from './auth.service';

// Listing results/filters/sorting (what used to live here as `listings` +
// loadLatest()/search()/searchNearby()) moved to ListingResultsStore
// (application/listing/listing-results.store.ts) — this service now only
// owns the create/update/delete lifecycle, unrelated to browsing results.
@Injectable({ providedIn: 'root' })
export class ListingService {
  private readonly listingRepository = inject(LISTING_REPOSITORY);
  private readonly imageStorage = inject(IMAGE_STORAGE);
  private readonly authService = inject(AuthService);
  private readonly transloco = inject(TranslocoService);

  // firestore.rules requires a new listing's imageUrls to start empty, so
  // images are uploaded and attached in a follow-up update after create().
  async create(data: NewListingInput, images: File[] = []): Promise<Listing> {
    const currentUser = this.authService.currentUser();
    if (!currentUser) throw new Error(this.transloco.translate('listingService.mustBeSignedIn'));
    if (data.ownerId !== currentUser.id) {
      throw new Error(this.transloco.translate('listingService.ownAccountOnly'));
    }

    const validationError = validateNewListing(data, this.transloco);
    if (validationError) throw new Error(validationError);

    const listing = await this.listingRepository.create({
      ...data,
      currency: data.currency as Listing['currency'],
      condition: data.condition as Listing['condition'],
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

  isOwner(ownerId: string): boolean {
    const user = this.authService.currentUser();
    return user !== null && ownerId === user.id;
  }
}
