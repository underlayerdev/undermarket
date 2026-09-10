import { Location } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../../application/services/auth.service';
import { ErrorService } from '../../../application/services/error.service';
import { ListingService } from '../../../application/services/listing.service';
import { SeoService } from '../../../core/seo/seo.service';
import { LISTING_REPOSITORY } from '../../../core/configuration/tokens';
import { ImageUploadComponent } from '../../../shared/image-upload/image-upload';
import { CATEGORIES } from '../../../domain/category/category.model';
import type { Category } from '../../../domain/category/category.model';
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  getMaxPriceForCurrency,
} from '../../../domain/currency/currency.model';
import type { Listing } from '../../../domain/listing/listing.model';
import type { NewListingInput } from '../../../domain/listing/listing.validator';
import {
  LISTING_DESCRIPTION_MAX_LENGTH,
  LISTING_TITLE_MAX_LENGTH,
  LISTING_TITLE_MIN_LENGTH,
} from '../../../domain/listing/listing-constraints';
import { createListingSlug, extractIdFromSlug } from '../../../shared/utils/slugify';
import {
  ButtonComponent,
  IconComponent,
  InputComponent,
  ModalComponent,
  SelectComponent,
  SkeletonComponent,
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
  imports: [
    FormField,
    ButtonComponent,
    IconComponent,
    ImageUploadComponent,
    InputComponent,
    ModalComponent,
    SelectComponent,
    SkeletonComponent,
    TextareaComponent,
    TranslocoDirective,
  ],
  providers: [ToastService],
  templateUrl: './new-listing.html',
  styleUrl: './new-listing.scss',
})
export class NewListingComponent {
  private readonly listingService = inject(ListingService);
  private readonly listingRepository = inject(LISTING_REPOSITORY);
  private readonly authService = inject(AuthService);
  private readonly errorService = inject(ErrorService);
  private readonly seoService = inject(SeoService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly location = inject(Location);
  private readonly transloco = inject(TranslocoService);

  // Presence of the :slug param is what distinguishes /listings/new from
  // /listings/:slug/edit — both route to this same component. Bound via
  // withComponentInputBinding() rather than read once from the route
  // snapshot, so it stays correct if Angular ever reuses this component
  // instance across two different :slug/edit activations (e.g. browser
  // back/forward between two edit pages).
  readonly slug = input<string | null>(null);
  readonly isEditMode = computed(() => !!this.slug());
  readonly editingListing = signal<Listing | null>(null);
  readonly isLoadingListing = signal(false);

  readonly categoryOptions: SelectOption[] = CATEGORIES.map((category) => ({
    value: category,
    label: category,
  }));
  readonly currencyOptions = computed<SelectOption[]>(() => {
    this.transloco.activeLang();
    return CURRENCIES.map((currency) => ({
      value: currency.code,
      label: this.transloco.translate(currency.labelKey),
    }));
  });

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

    required(listing.title, {
      message: this.transloco.translate('newListing.errors.titleRequired'),
      when: whenTouched,
    });
    minLength(listing.title, LISTING_TITLE_MIN_LENGTH, {
      message: this.transloco.translate('newListing.errors.titleTooShort', {
        minLength: LISTING_TITLE_MIN_LENGTH,
      }),
      when: whenTouched,
    });
    maxLength(listing.title, LISTING_TITLE_MAX_LENGTH, {
      message: this.transloco.translate('newListing.errors.titleTooLong', {
        maxLength: LISTING_TITLE_MAX_LENGTH,
      }),
      when: whenTouched,
    });

    required(listing.description, {
      message: this.transloco.translate('newListing.errors.descriptionRequired'),
      when: whenTouched,
    });
    maxLength(listing.description, LISTING_DESCRIPTION_MAX_LENGTH, {
      message: this.transloco.translate('newListing.errors.descriptionTooLong', {
        maxLength: LISTING_DESCRIPTION_MAX_LENGTH,
      }),
      when: whenTouched,
    });

    required(listing.currency, {
      message: this.transloco.translate('newListing.errors.currencyRequired'),
      when: whenTouched,
    });
    validate(listing.currency, ({ value, state }) =>
      state.touched() && value() && !CURRENCIES.some((currency) => currency.code === value())
        ? {
            kind: 'invalid',
            message: this.transloco.translate('newListing.errors.currencyInvalid'),
          }
        : undefined,
    );

    required(listing.price, {
      message: this.transloco.translate('newListing.errors.priceInvalid'),
      when: whenTouched,
    });
    validate(listing.price, ({ value, valueOf, state }) => {
      if (!state.touched()) return undefined;
      const n = parseFloat(value());
      if (value() === '' || isNaN(n))
        return {
          kind: 'invalid',
          message: this.transloco.translate('newListing.errors.priceInvalid'),
        };
      if (n < 0)
        return {
          kind: 'min',
          message: this.transloco.translate('newListing.errors.priceNegative'),
        };
      const maxPrice = getMaxPriceForCurrency(valueOf(listing.currency) ?? DEFAULT_CURRENCY);
      if (n > maxPrice)
        return {
          kind: 'max',
          message: this.transloco.translate('newListing.errors.priceTooHigh', { maxPrice }),
        };
      return undefined;
    });

    required(listing.category, {
      message: this.transloco.translate('newListing.errors.categoryRequired'),
      when: whenTouched,
    });
    validate(listing.category, ({ value, state }) =>
      state.touched() && value() && !CATEGORIES.includes(value() as Category)
        ? {
            kind: 'invalid',
            message: this.transloco.translate('newListing.errors.categoryInvalid'),
          }
        : undefined,
    );
  });

  readonly publishButtonNotReady = computed(
    () => this.isLoading() || this.listingForm().invalid() || !this.listingForm().touched(),
  );

  readonly publishButtonLabel = computed(() => {
    this.transloco.activeLang();
    if (this.isEditMode()) {
      return this.isLoading()
        ? this.transloco.translate('newListing.saving')
        : this.transloco.translate('newListing.saveChanges');
    }
    return this.isLoading()
      ? this.transloco.translate('newListing.publishing')
      : this.transloco.translate('newListing.publish');
  });

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

  constructor() {
    effect(() => {
      const slug = this.slug();
      if (slug) {
        void this.loadForEdit(slug);
      } else {
        this.seoService.setPage(this.transloco.translate('newListing.pageTitle'));
      }
    });
  }

  private async loadForEdit(slug: string): Promise<void> {
    const currentUser = this.authService.currentUser();
    this.isLoadingListing.set(true);
    try {
      const listing = await this.listingRepository.getById(extractIdFromSlug(slug));
      if (!listing || !currentUser || listing.ownerId !== currentUser.id) {
        await this.router.navigateByUrl('/profile');
        return;
      }

      this.editingListing.set(listing);
      this.listingModel.set({
        title: listing.title,
        description: listing.description,
        price: String(listing.price),
        currency: listing.currency,
        category: listing.category,
      });
      this.seoService.setPage(this.transloco.translate('newListing.editPageTitle'));
    } catch (err) {
      this.toastService.error(this.errorService.toUserMessage(err));
      await this.router.navigateByUrl('/profile');
    } finally {
      this.isLoadingListing.set(false);
    }
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
        const editing = this.editingListing();
        const listing = editing
          ? await this.updateExisting(editing, currentUser.id)
          : await this.listingService.create(
              toNewListingInput(this.listingModel(), currentUser.id),
              this.imageFiles(),
            );
        // replaceUrl: back from the new/edited listing should skip the
        // now-submitted form and return to wherever the user was before.
        await this.router.navigate(['/listings', createListingSlug(listing.title, listing.id)], {
          replaceUrl: true,
        });
        return [];
      } catch (err) {
        this.toastService.error(this.errorService.toUserMessage(err));
        return [];
      } finally {
        this.isLoading.set(false);
      }
    });
  }

  // Editing never touches status (publishing a draft is a separate, explicit
  // action elsewhere) or imageUrls (photo editing isn't supported yet).
  private async updateExisting(editing: Listing, ownerId: string): Promise<Listing> {
    const input = toNewListingInput(this.listingModel(), ownerId);
    const updated: Listing = {
      ...editing,
      ...input,
      currency: input.currency as Listing['currency'],
      category: input.category as Listing['category'],
      status: editing.status,
      imageUrls: editing.imageUrls,
    };
    await this.listingService.update(updated);
    return updated;
  }
}
