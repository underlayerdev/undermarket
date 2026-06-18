import { inject, Injectable, signal } from '@angular/core';
import { IMAGE_STORAGE, LISTING_REPOSITORY } from '../../core/configuration/tokens';
import type { Listing, ListingId } from '../../domain/models/listing.model';
import type { ListingSearchFilters } from '../../domain/repositories/listing.repository';

@Injectable({ providedIn: 'root' })
export class ListingService {
  private readonly listingRepository = inject(LISTING_REPOSITORY);
  private readonly imageStorage = inject(IMAGE_STORAGE);

  readonly listings = signal<Listing[]>([]);

  async loadLatest(): Promise<void> {
    const result = await this.listingRepository.getLatest();
    this.listings.set(result);
  }

  async search(filters: ListingSearchFilters): Promise<void> {
    const result = await this.listingRepository.search(filters);
    this.listings.set(result);
  }

  async create(
    data: Omit<Listing, 'id' | 'createdAt' | 'updatedAt' | 'imageUrls'>,
    imageFiles: File[],
  ): Promise<Listing> {
    const imageUrls = await Promise.all(imageFiles.map((f) => this.imageStorage.upload(f)));
    return this.listingRepository.create({ ...data, imageUrls });
  }

  async update(listing: Listing): Promise<void> {
    await this.listingRepository.update(listing);
  }

  async delete(id: ListingId): Promise<void> {
    await this.listingRepository.delete(id);
  }
}
