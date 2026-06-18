import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../application/services/auth.service';
import { ListingService } from '../../../application/services/listing.service';
import { SeoService } from '../../../core/seo/seo.service';
import { LISTING_REPOSITORY } from '../../../core/configuration/tokens';
import type { Listing } from '../../../domain/models/listing.model';
import { extractIdFromSlug } from '../../../shared/utils/slugify';
import {
  BreadcrumbComponent,
  ButtonComponent,
  ModalComponent,
  PillComponent,
  SkeletonComponent,
} from '@underlayerdev/ui';
import type { BreadcrumbItem } from '@underlayerdev/ui';

@Component({
  selector: 'app-listing-detail',
  standalone: true,
  imports: [DatePipe, BreadcrumbComponent, ButtonComponent, ModalComponent, PillComponent, SkeletonComponent],
  templateUrl: './listing-detail.html',
  styleUrl: './listing-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly listingRepository = inject(LISTING_REPOSITORY);
  protected readonly authService = inject(AuthService);
  private readonly listingService = inject(ListingService);
  private readonly seoService = inject(SeoService);

  readonly listing = signal<Listing | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly showDeleteModal = signal(false);

  readonly isOwner = computed(() => {
    const listing = this.listing();
    const user = this.authService.currentUser();
    return listing !== null && user !== null && listing.ownerId === user.id;
  });

  readonly activeImageIndex = signal(0);

  readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const l = this.listing();
    return [
      { label: 'Home', href: '/home' },
      { label: l ? l.title : 'Listing' },
    ];
  });

  async ngOnInit(): Promise<void> {
    const slug = this.route.snapshot.params['slug'] as string;
    const id = extractIdFromSlug(slug);

    try {
      const listing = await this.listingRepository.getById(id);
      if (listing) {
        this.listing.set(listing);
        this.seoService.setListing(listing);
      } else {
        this.errorMessage.set('This listing no longer exists.');
        this.seoService.setPage('Listing not found');
      }
    } catch {
      this.errorMessage.set('Failed to load listing. Please try again.');
      this.seoService.setPage('Error');
    } finally {
      this.isLoading.set(false);
    }
  }

  setActiveImage(index: number): void {
    this.activeImageIndex.set(index);
  }

  onDeleteClick(): void {
    this.showDeleteModal.set(true);
  }

  async confirmDelete(): Promise<void> {
    const listing = this.listing();
    if (!listing) return;
    this.showDeleteModal.set(false);
    await this.listingService.delete(listing.id);
  }
}
