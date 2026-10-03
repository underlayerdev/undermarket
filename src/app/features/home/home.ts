import { Component, computed, inject, OnInit } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import {
  LISTING_QUERY_FN,
  ListingResultsStore,
} from '../../application/listing/listing-results.store';
import { LISTING_REPOSITORY } from '../../core/configuration/tokens';
import { SeoService } from '../../core/seo/seo.service';
import type { ListingRepository } from '../../domain/listing/listing.repository';
import { ListingGridComponent } from '../../shared/listing/listing-grid/listing-grid';
import { HeroComponent } from '@underlayerdev/ui';
import type { HeroAction } from '@underlayerdev/ui';

@Component({
  selector: 'um-home',
  imports: [HeroComponent, ListingGridComponent, TranslocoDirective],
  providers: [
    ListingResultsStore,
    // Home has no category/sort/location UI at all — its own query function
    // just always shows the latest feed, ignoring location entirely, rather
    // than inheriting Discover/Search's nearby-search behavior by virtue of
    // sharing the same store class.
    {
      provide: LISTING_QUERY_FN,
      useFactory: (repository: ListingRepository) => () => repository.getLatest(),
      deps: [LISTING_REPOSITORY],
    },
  ],
  templateUrl: './home.html',
})
export class HomeComponent implements OnInit {
  protected readonly store = inject(ListingResultsStore);
  private readonly seoService = inject(SeoService);
  private readonly transloco = inject(TranslocoService);

  readonly heroPrimaryAction = computed<HeroAction>(() => {
    this.transloco.activeLang();
    return {
      label: this.transloco.translate('home.postListing'),
      routerLink: '/listings/new',
    };
  });

  ngOnInit(): void {
    this.seoService.setPage('', this.transloco.translate('home.seoDescription'));
  }
}
