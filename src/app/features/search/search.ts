import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ListingService } from '../../application/services/listing.service';
import { SeoService } from '../../core/seo/seo.service';
import { CATEGORIES } from '../../shared/constants/categories';
import { createListingSlug } from '../../shared/utils/slugify';
import {
  ButtonComponent,
  CardComponent,
  InputComponent,
  PillComponent,
  SelectComponent,
} from '@underlayerdev/ui';
import type { SelectOption } from '@underlayerdev/ui';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [RouterLink, ButtonComponent, CardComponent, InputComponent, PillComponent, SelectComponent],
  templateUrl: './search.html',
  styleUrl: './search.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent implements OnInit {
  protected readonly listingService = inject(ListingService);
  private readonly seoService = inject(SeoService);

  readonly createListingSlug = createListingSlug;

  readonly categoryOptions: SelectOption[] = CATEGORIES.map((c) => ({ value: c, label: c }));

  readonly query = signal('');
  readonly selectedCategory = signal<string | null>(null);

  ngOnInit(): void {
    this.seoService.setPage('Search', 'Search for secondhand items on Undermarket.');
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
}
