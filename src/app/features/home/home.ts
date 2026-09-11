import { NgOptimizedImage } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ErrorService } from '../../application/services/error.service';
import { ListingService } from '../../application/services/listing.service';
import { SeoService } from '../../core/seo/seo.service';
import { ListingPricePipe } from '../../shared/listing/listing-price/listing-price.pipe';
import { createListingSlug } from '../../shared/utils/slugify';
import { CardComponent, HeroComponent, ToastService } from '@underlayerdev/ui';
import type { HeroAction } from '@underlayerdev/ui';

@Component({
  selector: 'um-home',
  imports: [
    RouterLink,
    CardComponent,
    HeroComponent,
    NgOptimizedImage,
    ListingPricePipe,
    TranslocoDirective,
  ],
  providers: [ToastService],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent implements OnInit {
  protected readonly listingService = inject(ListingService);
  private readonly seoService = inject(SeoService);
  private readonly transloco = inject(TranslocoService);
  private readonly errorService = inject(ErrorService);
  private readonly toastService = inject(ToastService);

  readonly isLoading = signal(true);

  // Fixed placeholder count while loading, rendered in the same grid the
  // real cards use, so the layout doesn't resize once they swap in.
  readonly skeletonRows = computed(() => Array.from({ length: 8 }));

  readonly createListingSlug = createListingSlug;

  readonly heroPrimaryAction = computed<HeroAction>(() => {
    this.transloco.activeLang();
    return {
      label: this.transloco.translate('home.postListing'),
      routerLink: '/listings/new',
    };
  });

  async ngOnInit(): Promise<void> {
    this.seoService.setPage('', this.transloco.translate('home.seoDescription'));
    this.isLoading.set(true);
    try {
      await this.listingService.loadLatest();
    } catch (err) {
      this.toastService.error(this.errorService.toUserMessage(err));
    } finally {
      this.isLoading.set(false);
    }
  }
}
