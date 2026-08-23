import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../../application/services/auth.service';
import { ListingService } from '../../../application/services/listing.service';
import { SeoService } from '../../../core/seo/seo.service';
import { LISTING_REPOSITORY } from '../../../core/configuration/tokens';
import type { Listing } from '../../../domain/listing/listing.model';
import { ListingPricePipe } from '../../../shared/pipes/listing-price.pipe';
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
  selector: 'um-listing-detail',
  standalone: true,
  imports: [
    DatePipe,
    ListingPricePipe,
    BreadcrumbComponent,
    ButtonComponent,
    ModalComponent,
    PillComponent,
    SkeletonComponent,
    TranslocoDirective,
  ],
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
  private readonly transloco = inject(TranslocoService);

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
    this.transloco.activeLang();
    const l = this.listing();
    return [
      { label: this.transloco.translate('common.home'), routerLink: '/home' },
      { label: l ? l.title : this.transloco.translate('listingDetail.breadcrumbFallback') },
    ];
  });

  protected photoAltText(index: number): string {
    return this.transloco.translate('listingDetail.photoAlt', { photoNumber: index + 1 });
  }

  async ngOnInit(): Promise<void> {
    const slug = this.route.snapshot.params['slug'] as string;
    const id = extractIdFromSlug(slug);

    try {
      const listing = await this.listingRepository.getById(id);
      if (listing) {
        this.listing.set(listing);
        this.seoService.setListing(listing);
      } else {
        this.errorMessage.set(this.transloco.translate('listingDetail.notFound'));
        this.seoService.setPage(this.transloco.translate('listingDetail.notFoundPageTitle'));
      }
    } catch {
      this.errorMessage.set(this.transloco.translate('listingDetail.loadError'));
      this.seoService.setPage(this.transloco.translate('common.error'));
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
