import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../../application/services/auth.service';
import { ErrorService } from '../../../application/services/error.service';
import { SeoService } from '../../../core/seo/seo.service';
import { getInitials } from '../../../domain/user/user-display';
import { ListingPricePipe } from '../../../shared/listing/listing-price/listing-price.pipe';
import { LocaleDatePipe } from '../../../shared/pipes/locale-date/locale-date.pipe';
import { extractIdFromSlug } from '../../../shared/utils/slugify';
import {
  AvatarComponent,
  BreadcrumbComponent,
  ButtonComponent,
  IconComponent,
  ModalComponent,
  PillComponent,
} from '@underlayerdev/ui';
import type { BreadcrumbItem } from '@underlayerdev/ui';
import { ListingDetailErrorComponent } from './listing-detail-error/listing-detail-error';
import { ListingDetailStatusComponent } from './listing-detail-status/listing-detail-status';
import { ListingDetailLoadingComponent } from './listing-detail-loading/listing-detail-loading';
import { ListingDetailSimilarItems } from './listing-detail-similar-items/listing-detail-similar-items';
import { ListingDetailDescriptionComponent } from './listing-detail-description/listing-detail-description';
import { ListingDetailImagesComponent } from './listing-detail-images/listing-detail-images';
import {
  ListingActionResult,
  ListingDetailActionsComponent,
} from './listing-detail-actions/listing-detail-actions';
import { ListingDetailCtaComponent } from './listing-detail-cta/listing-detail-cta';
import { ListingDetailStore } from './listing-detail.store';
import { ShareButtonComponent } from '../../../shared/share-button/share-button';

@Component({
  selector: 'um-listing-detail',
  imports: [
    ListingPricePipe,
    LocaleDatePipe,
    AvatarComponent,
    BreadcrumbComponent,
    ButtonComponent,
    ModalComponent,
    PillComponent,
    RouterLink,
    TranslocoDirective,
    IconComponent,
    ListingDetailImagesComponent,
    ListingDetailErrorComponent,
    ListingDetailStatusComponent,
    ListingDetailLoadingComponent,
    ListingDetailSimilarItems,
    ListingDetailDescriptionComponent,
    ListingDetailActionsComponent,
    ListingDetailCtaComponent,
    ShareButtonComponent,
  ],
  providers: [ListingDetailStore],
  templateUrl: './listing-detail.html',
  styleUrl: './listing-detail.scss',
})
export class ListingDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  protected readonly authService = inject(AuthService);
  private readonly errorService = inject(ErrorService);
  private readonly seoService = inject(SeoService);
  private readonly transloco = inject(TranslocoService);

  // Provided on this component (see `providers` above), not `providedIn:
  // 'root'`: this state means "the listing this page is showing," not
  // something any unrelated feature should reach for, and it should be
  // destroyed with this component rather than outlive it. Descendants
  // (ListingDetailActionsComponent, ListingDetailSimilarItems, ...) get the
  // same instance by injecting it themselves — nothing needs to be threaded
  // down as an `@Input()`.
  protected readonly store = inject(ListingDetailStore);

  readonly getInitials = getInitials;
  readonly showDeleteModal = signal(false);

  // This page uses ul-modal, not toasts, for action feedback — a deliberate
  // choice, not just "whatever ListingDetailActionsComponent happened to
  // call." One signal rather than a boolean + a message, so there's no way
  // for them to disagree about whether something is currently showing.
  readonly resultModal = signal<ListingActionResult | null>(null);

  readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    this.transloco.activeLang();
    const listing = this.store.listing();
    return [
      { label: this.transloco.translate('common.home'), routerLink: '/home' },
      {
        label: listing
          ? listing.title
          : this.transloco.translate('listingDetail.breadcrumbFallback'),
      },
    ];
  });

  // Listing.location carries several fields not meant for display here
  // (countryCode, region, geohash, lat/lng — used for search/geocoding, not
  // shown to buyers) — only neighborhood + city are shown on the product page.
  readonly listingLocationLabel = computed(() => {
    const location = this.store.listing()?.location;
    if (!location) return null;
    return location.neighborhood ? `${location.neighborhood}, ${location.city}` : location.city;
  });

  async ngOnInit(): Promise<void> {
    await this.loadListing();
  }

  async retry(): Promise<void> {
    await this.loadListing();
  }

  // SEO is a page-level concern, not the store's — it reacts to whatever
  // `load()` leaves in `listing`/`errorType` rather than the store reaching
  // for `document.title` itself.
  private async loadListing(): Promise<void> {
    const slug = this.route.snapshot.params['slug'] as string;
    const id = extractIdFromSlug(slug);
    await this.store.load(id);

    const listing = this.store.listing();
    if (listing) {
      this.seoService.setListing(listing);
    } else if (this.store.errorType() === 'not-found') {
      this.seoService.setPage(this.transloco.translate('listingDetail.notFoundPageTitle'));
    } else {
      this.seoService.setPage(this.transloco.translate('common.error'));
    }
  }

  goBack(): void {
    this.location.back();
  }

  // Both ListingDetailActionsComponent instances (menu + list variants) emit
  // this rather than owning the dialog themselves — there are two of them
  // live at once (CSS just shows one per breakpoint), and there must be one
  // dialog, not two independently-toggleable ones.
  async confirmDelete(): Promise<void> {
    this.showDeleteModal.set(false);
    try {
      await this.store.delete();
      // store.delete() clears `listing`, and the template's @if/@else if
      // chain has nothing left to match at that point (not loading, no
      // error, no listing) — it would render blank instead of navigating
      // anywhere. Leaving the now-deleted listing's own page is correct
      // regardless, so this isn't a special case to route around.
      await this.router.navigate(['/profile']);
    } catch (err) {
      this.resultModal.set({ variant: 'error', message: this.errorService.toUserMessage(err) });
    }
  }
}
