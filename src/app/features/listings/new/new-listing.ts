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
import type { NewListingInput } from '../../../domain/listing/listing.validator';
import {
  LISTING_DESCRIPTION_MAX_LENGTH,
  LISTING_TITLE_MAX_LENGTH,
  LISTING_TITLE_MIN_LENGTH,
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
import type { LogicFn } from '@angular/forms/signals';
import {
  form,
  FormField,
  maxLength,
  minLength,
  required,
  submit,
  validate,
} from '@angular/forms/signals';

// The shape signal forms binds to: ul-input/ul-textarea controls always hold
// `string` and ul-select holds `string | null` until something is chosen, so
// this can't just be NewListingInput (price: number, currency/category:
// non-null string) without re-introducing "as CurrencyCode" casts. The one
// place this narrows back down to the validated domain shape is
// toNewListingInput() below.
interface NewListingFormModel {
  title: string;
  description: string;
  price: string;
  currency: string | null;
  category: string | null;
}

function toNewListingInput(value: NewListingFormModel, ownerId: string): NewListingInput {
  return {
    title: value.title.trim(),
    description: value.description.trim(),
    price: parseFloat(value.price),
    // required() + validate() on currency/category guarantee non-null here.
    currency: value.currency!,
    category: value.category!,
    status: 'active',
    ownerId,
  };
}

@Component({
  selector: 'um-new-listing',
  standalone: true,
  imports: [
    FormField,
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

  readonly categoryOptions: SelectOption[] = CATEGORIES.map((category) => ({
    value: category,
    label: category,
  }));
  readonly currencyOptions: SelectOption[] = CURRENCIES.map((currency) => ({
    value: currency.code,
    label: currency.label,
  }));

  readonly isLoading = signal(false);
  readonly imageFiles = signal<File[]>([]);
  readonly showDiscardModal = signal(false);

  readonly listingModel = signal<NewListingFormModel>({
    title: '',
    description: '',
    price: '',
    currency: DEFAULT_CURRENCY,
    category: null,
  });

  readonly listingForm = form(this.listingModel, (listing) => {
    // [formField] shows a field's errors as soon as they exist, with no
    // built-in "wait for touch" gate — required() would otherwise flag every
    // empty field red the instant the modal opens. Every rule below gates on
    // the field's own touched state (set per-field on blur, and on all
    // fields at once by submit()) to match the original UX.
    const whenTouched: LogicFn<unknown, boolean> = ({ state }) => state.touched();

    required(listing.title, { message: 'Title is required.', when: whenTouched });
    minLength(listing.title, LISTING_TITLE_MIN_LENGTH, {
      message: `Title must be at least ${LISTING_TITLE_MIN_LENGTH} characters.`,
      when: whenTouched,
    });
    maxLength(listing.title, LISTING_TITLE_MAX_LENGTH, {
      message: `Title must be at most ${LISTING_TITLE_MAX_LENGTH} characters.`,
      when: whenTouched,
    });

    required(listing.description, { message: 'Description is required.', when: whenTouched });
    maxLength(listing.description, LISTING_DESCRIPTION_MAX_LENGTH, {
      message: `Description must be at most ${LISTING_DESCRIPTION_MAX_LENGTH} characters.`,
      when: whenTouched,
    });

    required(listing.currency, { message: 'Please select a currency.', when: whenTouched });
    validate(listing.currency, ({ value, state }) =>
      state.touched() && value() && !CURRENCIES.some((currency) => currency.code === value())
        ? { kind: 'invalid', message: 'Please select a valid currency.' }
        : undefined,
    );

    required(listing.price, { message: 'Please enter a valid price.', when: whenTouched });
    validate(listing.price, ({ value, valueOf, state }) => {
      if (!state.touched()) return undefined;
      const n = parseFloat(value());
      if (value() === '' || isNaN(n))
        return { kind: 'invalid', message: 'Please enter a valid price.' };
      if (n < 0) return { kind: 'min', message: 'Price must be 0 or more.' };
      const maxPrice = getMaxPriceForCurrency(valueOf(listing.currency) ?? DEFAULT_CURRENCY);
      if (n > maxPrice) return { kind: 'max', message: `Price must be at most ${maxPrice}.` };
      return undefined;
    });

    required(listing.category, { message: 'Please select a category.', when: whenTouched });
    validate(listing.category, ({ value, state }) =>
      state.touched() && value() && !CATEGORIES.includes(value() as Category)
        ? { kind: 'invalid', message: 'Please select a valid category.' }
        : undefined,
    );
  });

  readonly publishButtonNotReady = computed(
    () => this.isLoading() || this.listingForm().invalid() || !this.listingForm().touched(),
  );

  readonly hasUnsavedChanges = computed(() => {
    const value = this.listingModel();
    return (
      !!value.title.trim() ||
      !!value.description.trim() ||
      !!value.price.trim() ||
      !!value.category ||
      !!this.imageFiles().length
    );
  });

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
    const currentUser = this.authService.currentUser();
    if (!currentUser) return;

    await submit(this.listingForm, async () => {
      this.isLoading.set(true);
      try {
        const listing = await this.listingService.create(
          toNewListingInput(this.listingModel(), currentUser.id),
          this.imageFiles(),
        );
        await this.router.navigate(['/listings', createListingSlug(listing.title, listing.id)]);
        return [];
      } catch (err) {
        this.toastService.error(this.errorService.toUserMessage(err));
        return [];
      } finally {
        this.isLoading.set(false);
      }
    });
  }
}
