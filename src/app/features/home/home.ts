import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ListingService } from '../../application/services/listing.service';
import { SeoService } from '../../core/seo/seo.service';
import { ListingPricePipe } from '../../shared/pipes/listing-price.pipe';
import { createListingSlug } from '../../shared/utils/slugify';
import { CardComponent, HeroComponent } from '@underlayerdev/ui';
import type { HeroAction } from '@underlayerdev/ui';

@Component({
  selector: 'um-home',
  standalone: true,
  imports: [RouterLink, CardComponent, HeroComponent, ListingPricePipe, TranslocoDirective],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  protected readonly listingService = inject(ListingService);
  private readonly seoService = inject(SeoService);
  private readonly transloco = inject(TranslocoService);

  readonly createListingSlug = createListingSlug;

  readonly heroPrimaryAction = computed<HeroAction>(() => {
    this.transloco.activeLang();
    return {
      label: this.transloco.translate('home.postListing'),
      routerLink: '/listings/new',
    };
  });

  ngOnInit(): void {
    this.seoService.setPage('', this.transloco.translate('home.seoDescription'));
    this.listingService.loadLatest();
  }
}
