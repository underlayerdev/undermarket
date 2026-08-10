import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ListingService } from '../../application/services/listing.service';
import { SeoService } from '../../core/seo/seo.service';
import { CATEGORIES } from '../../domain/category/category.model';
import { ListingPricePipe } from '../../shared/pipes/listing-price.pipe';
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
  selector: 'um-search',
  standalone: true,
  imports: [
    RouterLink,
    ButtonComponent,
    CardComponent,
    InputComponent,
    PillComponent,
    SelectComponent,
    ListingPricePipe,
  ],
  templateUrl: './search.html',
  styleUrl: './search.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent implements OnInit {
  protected readonly listingService = inject(ListingService);
  private readonly seoService = inject(SeoService);

  readonly createListingSlug = createListingSlug;

  readonly categoryOptions: SelectOption[] = CATEGORIES.map((c) => ({ value: c, label: c }));

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
