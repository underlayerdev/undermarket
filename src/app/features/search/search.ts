import { Location } from '@angular/common';
import { Component, computed, effect, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ListingService } from '../../application/services/listing.service';
import { SeoService } from '../../core/seo/seo.service';
import { CATEGORIES } from '../../domain/category/category.model';
import { ListingPricePipe } from '../../shared/listing/listing-price/listing-price.pipe';
import { addRecentSearch, getRecentSearches } from '../../shared/search/recent-searches.util';
import { createListingSlug } from '../../shared/utils/slugify';
import {
  ButtonComponent,
  CardComponent,
  IconComponent,
  PillComponent,
  SearchInputComponent,
  SelectComponent,
} from '@underlayerdev/ui';
import type { SearchSuggestion, SelectOption } from '@underlayerdev/ui';

@Component({
  selector: 'um-search',
  imports: [
    RouterLink,
    ButtonComponent,
    CardComponent,
    IconComponent,
    PillComponent,
    SelectComponent,
    SearchInputComponent,
    ListingPricePipe,
    TranslocoDirective,
  ],
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class SearchComponent implements OnInit {
  // Separate history bucket from profile-listings' own search input so
  // unrelated searches never mix in the same recent-searches list.
  private static readonly HISTORY_KEY = 'listings';

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
  private readonly recentSearches = signal(getRecentSearches(SearchComponent.HISTORY_KEY));
  readonly recentSearchSuggestions = computed<SearchSuggestion[]>(() =>
    this.recentSearches().map((recentQuery) => ({ value: recentQuery, label: recentQuery })),
  );

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

  onSearchSubmit(value: string): void {
    this.recordRecentSearch(value);
    this.onSearch();
  }

  onSuggestionSelected(suggestion: SearchSuggestion): void {
    this.recordRecentSearch(suggestion.value);
    this.onSearch();
  }

  private recordRecentSearch(value: string): void {
    const trimmed = value.trim();
    if (!trimmed) return;
    addRecentSearch(SearchComponent.HISTORY_KEY, trimmed);
    this.recentSearches.set(getRecentSearches(SearchComponent.HISTORY_KEY));
  }

  clearCategory(): void {
    this.selectedCategory.set(null);
    this.onSearch();
  }

  goBack(): void {
    this.location.back();
  }
}
