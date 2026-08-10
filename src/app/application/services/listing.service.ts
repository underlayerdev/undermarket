import { inject, Injectable, signal } from '@angular/core';
import { LISTING_REPOSITORY } from '../../core/configuration/tokens';
import type { Listing, ListingId } from '../../domain/listing/listing.model';
import type { ListingSearchFilters } from '../../domain/listing/listing.repository';
import { validateNewListing } from '../../domain/listing/listing.validator';
import type { NewListingInput } from '../../domain/listing/listing.validator';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ListingService {
  private readonly listingRepository = inject(LISTING_REPOSITORY);
  private readonly authService = inject(AuthService);

  readonly listings = signal<Listing[]>([]);

  async loadLatest(): Promise<void> {
    const result = await this.listingRepository.getLatest();
    this.listings.set(result);
  }

  async search(filters: ListingSearchFilters): Promise<void> {
    const result = await this.listingRepository.search(filters);
    this.listings.set(result);
  }

  // Image upload is intentionally not wired up yet (Cloudinary is a stub) —
  // every new listing is created with an empty imageUrls array for now.
  async create(data: NewListingInput): Promise<Listing> {
    const currentUser = this.authService.currentUser();
    if (!currentUser) throw new Error('You must be signed in to post a listing.');
    if (data.ownerId !== currentUser.id) {
      throw new Error('You can only create listings for your own account.');
    }

    const validationError = validateNewListing(data);
    if (validationError) throw new Error(validationError);

    return this.listingRepository.create({
      ...data,
      currency: data.currency as Listing['currency'],
      category: data.category as Listing['category'],
      imageUrls: [],
    });
  }

  async update(listing: Listing): Promise<void> {
    await this.listingRepository.update(listing);
  }

  async delete(id: ListingId): Promise<void> {
    await this.listingRepository.delete(id);
  }
}
