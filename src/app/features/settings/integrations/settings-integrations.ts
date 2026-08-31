import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../../application/services/auth.service';
import { ListingService } from '../../../application/services/listing.service';
import { MercadoLibreService } from '../../../application/services/mercado-libre.service';
import { LISTING_REPOSITORY } from '../../../core/configuration/tokens';
import type { Listing, ListingId } from '../../../domain/listing/listing.model';
import { ListingPricePipe } from '../../../shared/pipes/listing-price/listing-price.pipe';
import {
  ButtonComponent,
  CardComponent,
  IconComponent,
  StatusComponent,
  ToastService,
} from '@underlayerdev/ui';

@Component({
  selector: 'um-settings-integrations',
  imports: [
    ButtonComponent,
    CardComponent,
    IconComponent,
    ListingPricePipe,
    RouterLink,
    StatusComponent,
    TranslocoDirective,
  ],
  templateUrl: './settings-integrations.html',
  styleUrl: './settings-integrations.scss',
})
export class SettingsIntegrationsComponent implements OnInit {
  protected readonly mercadoLibreService = inject(MercadoLibreService);
  private readonly listingRepository = inject(LISTING_REPOSITORY);
  private readonly listingService = inject(ListingService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  private readonly toastService = inject(ToastService);

  readonly draftListings = signal<Listing[]>([]);
  readonly loadingDrafts = signal(false);
  readonly publishingId = signal<ListingId | null>(null);

  async ngOnInit(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    const connected = params.get('connected');
    const error = params.get('error');

    if (connected) {
      this.toastService.success(this.transloco.translate('settings.mercadoLibreConnected'));
    } else if (error) {
      this.toastService.error(this.transloco.translate('settings.mercadoLibreConnectError'));
    }

    if (connected || error) {
      // Clears ?connected=/?error= so refreshing the page doesn't re-show
      // the toast; replaceUrl so back doesn't return to this transient state.
      await this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    }

    await this.mercadoLibreService.refreshStatus();

    if (this.mercadoLibreService.status()?.connected) {
      await this.loadDrafts();
    }
  }

  async onConnectClick(): Promise<void> {
    await this.mercadoLibreService.connect();
  }

  async onImportClick(): Promise<void> {
    try {
      const { importedCount, skippedCount } = await this.mercadoLibreService.importListings();
      this.toastService.success(
        this.transloco.translate('settings.mercadoLibreImportResult', {
          imported: importedCount,
          skipped: skippedCount,
        }),
      );
      await this.loadDrafts();
    } catch {
      this.toastService.error(this.transloco.translate('settings.mercadoLibreImportError'));
    }
  }

  async onPublishClick(listing: Listing): Promise<void> {
    this.publishingId.set(listing.id);
    try {
      await this.listingService.update({ ...listing, status: 'active' });
      this.draftListings.update((listings) => listings.filter((item) => item.id !== listing.id));
      this.toastService.success(this.transloco.translate('settings.mercadoLibrePublished'));
    } catch {
      this.toastService.error(this.transloco.translate('settings.mercadoLibrePublishError'));
    } finally {
      this.publishingId.set(null);
    }
  }

  private async loadDrafts(): Promise<void> {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return;

    this.loadingDrafts.set(true);
    try {
      const listings = await this.listingRepository.getByOwner(currentUser.id);
      this.draftListings.set(
        listings.filter(
          (listing) => listing.status === 'draft' && listing.sourceProvider === 'mercadolibre',
        ),
      );
    } finally {
      this.loadingDrafts.set(false);
    }
  }
}
