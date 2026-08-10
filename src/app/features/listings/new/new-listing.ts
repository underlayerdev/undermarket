import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../application/services/auth.service';
import { ErrorService } from '../../../application/services/error.service';
import { ListingService } from '../../../application/services/listing.service';
import { SeoService } from '../../../core/seo/seo.service';
import { ImageUploadComponent } from '../../../shared/image-upload/image-upload';
import { CATEGORIES } from '../../../domain/category/category.model';
import type { Category } from '../../../domain/category/category.model';
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  getMaxPriceForCurrency,
} from '../../../domain/currency/currency.model';
import type { CurrencyCode } from '../../../domain/currency/currency.model';
import {
  LISTING_DESCRIPTION_MAX_LENGTH,
  LISTING_TITLE_MAX_LENGTH,
} from '../../../domain/listing/listing-constraints';
import { createListingSlug } from '../../../shared/utils/slugify';
import {
  ButtonComponent,
  IconComponent,
  InputComponent,
  ModalComponent,
  SelectComponent,
  TextareaComponent,
  ToastService,
} from '@underlayerdev/ui';
import type { SelectOption } from '@underlayerdev/ui';

@Component({
  selector: 'um-new-listing',
  standalone: true,
  imports: [
    ButtonComponent,
    IconComponent,
    ImageUploadComponent,
    InputComponent,
    ModalComponent,
    SelectComponent,
    TextareaComponent,
  ],
  providers: [ToastService],
  templateUrl: './new-listing.html',
  styleUrl: './new-listing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewListingComponent implements OnInit {
  private readonly listingService = inject(ListingService);
  private readonly authService = inject(AuthService);
  private readonly errorService = inject(ErrorService);
  private readonly seoService = inject(SeoService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly location = inject(Location);

  readonly categoryOptions: SelectOption[] = CATEGORIES.map((c) => ({ value: c, label: c }));
  readonly currencyOptions: SelectOption[] = CURRENCIES.map((c) => ({
    value: c.code,
    label: c.label,
  }));

  readonly isLoading = signal(false);
  readonly touched = signal(false);

  readonly titleValue = signal('');
  readonly descriptionValue = signal('');
  readonly priceValue = signal('');
  readonly currencyValue = signal<string | null>(DEFAULT_CURRENCY);
  readonly categoryValue = signal<string | null>(null);
  readonly imageFiles = signal<File[]>([]);

  readonly titleError = computed(() => {
    if (!this.touched()) return null;
    const v = this.titleValue().trim();
    if (!v) return 'Title is required.';
    if (v.length > LISTING_TITLE_MAX_LENGTH) {
      return `Title must be at most ${LISTING_TITLE_MAX_LENGTH} characters.`;
    }
    return null;
  });

  readonly descriptionError = computed(() => {
    if (!this.touched()) return null;
    const v = this.descriptionValue().trim();
    if (!v) return 'Description is required.';
    if (v.length > LISTING_DESCRIPTION_MAX_LENGTH) {
      return `Description must be at most ${LISTING_DESCRIPTION_MAX_LENGTH} characters.`;
    }
    return null;
  });

  readonly currencyError = computed(() => {
    if (!this.touched()) return null;
    const currency = this.currencyValue();
    if (!currency) return 'Please select a currency.';
    if (!CURRENCIES.some((c) => c.code === currency)) return 'Please select a valid currency.';
    return null;
  });

  readonly priceError = computed(() => {
    if (!this.touched()) return null;
    const n = parseFloat(this.priceValue());
    if (this.priceValue() === '' || isNaN(n)) return 'Please enter a valid price.';
    if (n < 0) return 'Price must be 0 or more.';
    const maxPrice = getMaxPriceForCurrency(this.currencyValue() ?? DEFAULT_CURRENCY);
    if (n > maxPrice) return `Price must be at most ${maxPrice}.`;
    return null;
  });

  readonly categoryError = computed(() => {
    if (!this.touched()) return null;
    const category = this.categoryValue();
    if (!category) return 'Please select a category.';
    if (!CATEGORIES.includes(category as Category)) return 'Please select a valid category.';
    return null;
  });

  readonly isFormValid = computed(
    () =>
      !this.titleError() &&
      !this.descriptionError() &&
      !this.currencyError() &&
      !this.priceError() &&
      !this.categoryError(),
  );

  readonly hasUnsavedChanges = computed(
    () =>
      !!this.titleValue().trim() ||
      !!this.descriptionValue().trim() ||
      !!this.priceValue().trim() ||
      !!this.categoryValue() ||
      !!this.imageFiles().length,
  );

  readonly showDiscardModal = signal(false);

  ngOnInit(): void {
    this.seoService.setPage('Post a Listing');
  }

  onClose(): void {
    if (this.hasUnsavedChanges()) {
      this.showDiscardModal.set(true);
      return;
    }
    this.location.back();
  }

  confirmDiscard(): void {
    this.location.back();
  }

  // No FormsModule in this app (state lives in signals, not NgForm), so
  // there's no NgForm directive to turn a native "submit" into "ngSubmit"
  // with preventDefault() already applied — do it ourselves here instead.
  onFormSubmit(event: SubmitEvent): void {
    event.preventDefault();
    void this.onSubmit();
  }

  async onSubmit(): Promise<void> {
    this.touched.set(true);
    if (!this.isFormValid()) return;

    const currentUser = this.authService.currentUser();
    if (!currentUser) return;

    this.isLoading.set(true);

    try {
      const listing = await this.listingService.create({
        title: this.titleValue().trim(),
        description: this.descriptionValue().trim(),
        price: parseFloat(this.priceValue()),
        // isFormValid() already confirmed these against CURRENCIES/CATEGORIES.
        currency: this.currencyValue() as CurrencyCode,
        category: this.categoryValue() as Category,
        status: 'active',
        ownerId: currentUser.id,
      });
      await this.router.navigate(['/listings', createListingSlug(listing.title, listing.id)]);
    } catch (err) {
      this.toastService.error(this.errorService.toUserMessage(err));
    } finally {
      this.isLoading.set(false);
    }
  }
}
