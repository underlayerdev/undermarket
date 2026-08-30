import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../../application/services/auth.service';
import { ListingService } from '../../../application/services/listing.service';
import { SeoService } from '../../../core/seo/seo.service';
import { LISTING_REPOSITORY } from '../../../core/configuration/tokens';
import type { Listing } from '../../../domain/listing/listing.model';
import { ImageLightboxService } from '../../../shared/image-lightbox/image-lightbox.service';
import { ListingPricePipe } from '../../../shared/pipes/listing-price/listing-price.pipe';
import { LocaleDatePipe } from '../../../shared/pipes/locale-date/locale-date.pipe';
import { extractIdFromSlug } from '../../../shared/utils/slugify';
import {
  BreadcrumbComponent,
  ButtonComponent,
  CarouselComponent,
  CarouselItemComponent,
  IconComponent,
  ModalComponent,
  PillComponent,
  SkeletonComponent,
} from '@underlayerdev/ui';
import type { BreadcrumbItem } from '@underlayerdev/ui';
import { Options } from '@splidejs/splide';
import {
  ListingDetailErrorComponent,
  ListingDetailErrorType,
} from './listing-detail-error/listing-detail-error';

@Component({
  selector: 'um-listing-detail',
  imports: [
    ListingPricePipe,
    LocaleDatePipe,
    BreadcrumbComponent,
    ButtonComponent,
    ModalComponent,
    PillComponent,
    SkeletonComponent,
    TranslocoDirective,
    IconComponent,
    CarouselComponent,
    CarouselItemComponent,
    ListingDetailErrorComponent,
  ],
  templateUrl: './listing-detail.html',
  styleUrl: './listing-detail.scss',
})
export class ListingDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly listingRepository = inject(LISTING_REPOSITORY);
  protected readonly authService = inject(AuthService);
  private readonly listingService = inject(ListingService);
  private readonly seoService = inject(SeoService);
  private readonly transloco = inject(TranslocoService);
  private readonly imageLightboxService = inject(ImageLightboxService);

  readonly listing = signal<Listing | null>(null);
  readonly isLoading = signal(true);
  readonly errorType = signal<ListingDetailErrorType | null>(null);
  readonly showDeleteModal = signal(false);

  readonly isOwner = computed(() => {
    const listing = this.listing();
    const user = this.authService.currentUser();
    return listing !== null && user !== null && listing.ownerId === user.id;
  });

  readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    this.transloco.activeLang();
    const l = this.listing();
    return [
      { label: this.transloco.translate('common.home'), routerLink: '/home' },
      { label: l ? l.title : this.transloco.translate('listingDetail.breadcrumbFallback') },
    ];
  });

  readonly carouselOptions: Options = {
    autoplay: false,
  };

  protected photoAltText(index: number): string {
    return this.transloco.translate('listingDetail.photoAlt', { photoNumber: index + 1 });
  }

  protected openLightbox(index: number): void {
    const listing = this.listing();
    if (!listing) return;
    void this.imageLightboxService.open(listing.imageUrls, index, (i) => this.photoAltText(i));
  }

  async ngOnInit(): Promise<void> {
    await this.loadListing();
  }

  async retry(): Promise<void> {
    this.isLoading.set(true);
    this.errorType.set(null);
    await this.loadListing();
  }

  private async loadListing(): Promise<void> {
    const slug = this.route.snapshot.params['slug'] as string;
    const id = extractIdFromSlug(slug);

    try {
      const listing = await this.listingRepository.getById(id);
      if (listing) {
        this.listing.set(listing);
        this.seoService.setListing(listing);
      } else {
        this.errorType.set('not-found');
        this.seoService.setPage(this.transloco.translate('listingDetail.notFoundPageTitle'));
      }
    } catch {
      this.errorType.set('generic');
      this.seoService.setPage(this.transloco.translate('common.error'));
    } finally {
      this.isLoading.set(false);
    }
  }

  goBack(): void {
    this.location.back();
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
