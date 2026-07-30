import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ListingService } from '../../application/services/listing.service';
import { SeoService } from '../../core/seo/seo.service';
import { createListingSlug } from '../../shared/utils/slugify';
import { CardComponent, HeroComponent } from '@underlayerdev/ui';
import type { HeroAction } from '@underlayerdev/ui';

@Component({
  selector: 'um-home',
  standalone: true,
  imports: [RouterLink, CardComponent, HeroComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  protected readonly listingService = inject(ListingService);
  private readonly seoService = inject(SeoService);

  readonly createListingSlug = createListingSlug;

  readonly heroPrimaryAction: HeroAction = {
    label: 'Post a Listing',
    routerLink: '/listings/new',
  };

  ngOnInit(): void {
    this.seoService.setPage('', 'Discover secondhand treasures on Undermarket.');
    this.listingService.loadLatest();
  }
}
