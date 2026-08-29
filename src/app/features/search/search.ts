import { Location } from '@angular/common';
import { Component, effect, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ListingService } from '../../application/services/listing.service';
import { SeoService } from '../../core/seo/seo.service';
import { CATEGORIES } from '../../domain/category/category.model';
import { ListingPricePipe } from '../../shared/pipes/listing-price/listing-price.pipe';
import { createListingSlug } from '../../shared/utils/slugify';
import {
  ButtonComponent,
  CardComponent,
  IconComponent,
  InputComponent,
  PillComponent,
  SelectComponent,
} from '@underlayerdev/ui';
import type { SelectOption } from '@underlayerdev/ui';

@Component({
  selector: 'um-search',
  imports: [
    RouterLink,
    ButtonComponent,
    CardComponent,
    IconComponent,
    InputComponent,
    PillComponent,
    SelectComponent,
    ListingPricePipe,
    TranslocoDirective,
  ],
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class SearchComponent implements OnInit {
  protected readonly listingService = inject(ListingService);
  private readonly seoService = inject(SeoService);
  private readonly transloco = inject(TranslocoService);
  private readonly location = inject(Location);

  readonly createListingSlug = createListingSlug;

  readonly categoryOptions: SelectOption[] = CATEGORIES.map((category) => ({
    value: category,
    label: category,
  }));

  /** Bound to the `q` query param via withComponentInputBinding(). */
  readonly q = input<string>('');

  readonly query = signal('');
  readonly selectedCategory = signal<string | null>(null);

  constructor() {
    effect(() => {
      const incoming = this.q();
      if (incoming && incoming !== this.query()) {
        this.query.set(incoming);
        this.onSearch();
      }
    });
  }

  ngOnInit(): void {
    this.seoService.setPage(
      this.transloco.translate('search.pageTitle'),
      this.transloco.translate('search.seoDescription'),
    );
  }

  onSearch(): void {
    this.listingService.search({
      query: this.query() || undefined,
      category: this.selectedCategory() ?? undefined,
    });
  }

  clearCategory(): void {
    this.selectedCategory.set(null);
    this.onSearch();
  }

  onClose(): void {
    this.location.back();
  }
}
