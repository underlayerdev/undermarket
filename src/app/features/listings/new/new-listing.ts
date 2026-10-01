import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../../application/services/auth.service';
import { CategoryService } from '../../../application/category/category.service';
import { ErrorService } from '../../../application/services/error.service';
import { ListingService } from '../../../application/services/listing.service';
import { LocationService } from '../../../application/services/location.service';
import { toLocationErrorMessage } from '../../../application/services/location-error.util';
import { SearchLocationService } from '../../../application/services/search-location.service';
import { NavigationService } from '../../../core/navigation/navigation.service';
import { SeoService } from '../../../core/seo/seo.service';
import { LISTING_REPOSITORY } from '../../../core/configuration/tokens';
import { ImageUploadComponent } from '../../../shared/image-upload/image-upload';
import type { CategoryNode } from '../../../domain/category-node/category-node.model';
import { CONDITIONS } from '../../../domain/condition/condition.model';
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  getMaxPriceForCurrency,
} from '../../../domain/currency/currency.model';
import type { LocationArea } from '../../../domain/location/location.model';
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
  CategoryPickerComponent,
  IconComponent,
  InputComponent,
  ModalComponent,
  SelectComponent,
  SkeletonComponent,
  TextareaComponent,
  ToastService,
} from '@underlayerdev/ui';
import type { CategoryPickerNode, SelectOption } from '@underlayerdev/ui';
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
  categoryId: string | null;
  condition: string | null;
  // Not part of the ul-input/ul-select signal-forms graph below, and never
  // set by the seller directly — see resolveDefaultLocation(). Matches how
  // Wallapop/Vinted work: location is an account-level setting, not a
  // per-listing question.
  location: LocationArea | null;
}

function toNewListingInput(
  value: NewListingFormModel,
  ownerId: string,
  category: CategoryNode,
): NewListingInput {
  return {
    title: value.title.trim(),
    description: value.description.trim(),
    price: parseFloat(value.price),
    // required() + validate() on currency guarantees non-null here.
    currency: value.currency!,
    categoryId: category.categoryId,
    categoryPath: category.path,
    // Omitted (not set to undefined) when the category has no condition —
    // Firestore rejects a literal undefined field value.
    ...(value.condition ? { condition: value.condition } : {}),
    status: 'active',
    ownerId,
    // Guaranteed non-null by the onSubmit() guard below.
    location: value.location!,
  };
}

@Component({
  selector: 'um-new-listing',
  imports: [
    FormField,
    ButtonComponent,
    CategoryPickerComponent,
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
  private readonly navigationService = inject(NavigationService);
  private readonly transloco = inject(TranslocoService);
  private readonly searchLocationService = inject(SearchLocationService);
  private readonly locationService = inject(LocationService);
  private readonly categoryService = inject(CategoryService);

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

  readonly categoryPickerNodes = computed<CategoryPickerNode[]>(() => {
    this.transloco.activeLang();
    return this.categoryService.orderedTree().map((node) => ({
      id: node.categoryId,
      parentId: node.parentId,
      label: this.transloco.translate(`category.${node.categoryId}`),
      // Root-only: every descendant just inherits its root's icon (see
      // category-node.model.ts), so showing it again at deeper levels would
      // just repeat the same glyph without adding information. ul-category-picker
      // itself has no opinion on this — it renders whatever icon a node is given.
      icon: node.depth === 0 ? node.icon : undefined,
      isLeaf: node.isLeaf,
    }));
  });
  readonly conditionOptions = computed<SelectOption[]>(() => {
    this.transloco.activeLang();
    return CONDITIONS.map((condition) => ({
      value: condition.value,
      label: this.transloco.translate(condition.labelKey),
    }));
  });
  // False for categories with no physical condition (e.g. services) — the
  // template hides the field entirely rather than showing it disabled/empty.
  readonly conditionRequired = computed(() => {
    const categoryId = this.listingModel().categoryId;
    return categoryId ? this.categoryService.requiresCondition(categoryId) : true;
  });
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

  readonly isResolvingLocation = signal(false);
  readonly locationError = signal<string | null>(null);

  readonly listingModel = signal<NewListingFormModel>({
    title: '',
    description: '',
    price: '',
    currency: DEFAULT_CURRENCY,
    categoryId: null,
    condition: null,
    location: null,
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

    required(listing.categoryId, {
      message: this.transloco.translate('newListing.errors.categoryRequired'),
      when: whenTouched,
    });
    validate(listing.categoryId, ({ value, state }) =>
      state.touched() && value() && !this.categoryService.getById(value()!)?.isLeaf
        ? {
            kind: 'invalid',
            message: this.transloco.translate('newListing.errors.categoryInvalid'),
          }
        : undefined,
    );

    required(listing.condition, {
      message: this.transloco.translate('newListing.errors.conditionRequired'),
      when: ({ state }) => state.touched() && this.conditionRequired(),
    });
    validate(listing.condition, ({ value, state }) =>
      state.touched() && value() && !CONDITIONS.some((condition) => condition.value === value())
        ? {
            kind: 'invalid',
            message: this.transloco.translate('newListing.errors.conditionInvalid'),
          }
        : undefined,
    );
  });

  readonly publishButtonNotReady = computed(
    () =>
      this.isLoading() ||
      this.listingForm().invalid() ||
      !this.listingForm().touched() ||
      !this.listingModel().location,
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
      !!value.categoryId ||
      !!value.condition ||
      !!this.imageFiles().length
    );
  });

  constructor() {
    // Needed in both new and edit mode (edit mode resolves the listing's
    // existing categoryId back to a tree node for the picker's closed-field
    // breadcrumb) — unlike location, not gated on which mode this is.
    void this.categoryService.ensureLoaded();

    // Switching into a no-condition category (e.g. services) drops any
    // condition already picked, rather than silently keeping it around
    // unset-but-present in the form model.
    effect(() => {
      if (!this.conditionRequired() && this.listingModel().condition) {
        this.listingModel.update((model) => ({ ...model, condition: null }));
      }
    });

    effect(() => {
      const slug = this.slug();
      if (slug) {
        void this.loadForEdit(slug);
      } else {
        void this.seedLocationForNewListing();
        this.seoService.setPage(this.transloco.translate('newListing.pageTitle'));
      }
    });
  }

  private async seedLocationForNewListing(): Promise<void> {
    const area = await this.resolveDefaultLocation();
    if (area) this.listingModel.update((model) => ({ ...model, location: area }));
  }

  /**
   * Wallapop/Vinted don't ask per listing either — location is an
   * account-level setting. Reuses the seller's current search location if
   * they have one; if not (e.g. this is the very first thing they do after
   * signing up, before ever visiting discover/search), falls back to the
   * same browser-geolocation prompt search uses, and persists the result so
   * it's reused for future listings/searches too.
   */
  private async resolveDefaultLocation(): Promise<LocationArea | null> {
    // Only the LocationArea fields, not radiusKm/source/updatedAt.
    const current = this.searchLocationService.searchLocation();
    if (current) {
      const { radiusKm, source, updatedAt, ...area } = current;
      return area;
    }

    this.isResolvingLocation.set(true);
    this.locationError.set(null);
    try {
      const area = await this.locationService.resolveCurrentArea();
      await this.searchLocationService.setSearchLocation(area, 'browser-geolocation');
      return area;
    } catch (err) {
      this.locationError.set(toLocationErrorMessage(err, this.transloco));
      return null;
    } finally {
      this.isResolvingLocation.set(false);
    }
  }

  async retryLocation(): Promise<void> {
    const area = await this.resolveDefaultLocation();
    if (area) this.listingModel.update((model) => ({ ...model, location: area }));
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
        // Every existing listing has categoryId by now (docs/categories-plan.md
        // phase 4 backfill) — the fallback only guards a doc that somehow
        // slipped through.
        categoryId: listing.categoryId ?? null,
        // Older listings predate this field too — unlike location there's no
        // sensible default to backfill automatically, so it's just left
        // unset and the seller picks one before the edit can be saved.
        condition: listing.condition ?? null,
        location: listing.location ?? null,
      });
      // Older listings predate this field — backfill it the same way a new
      // listing gets one, rather than leaving the seller stuck unable to
      // save an edit at all (there's no picker to set it manually anymore).
      if (!listing.location) {
        const area = await this.resolveDefaultLocation();
        if (area) this.listingModel.update((model) => ({ ...model, location: area }));
      }
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
    this.navigationService.goBackOr(['/home']);
  }

  confirmDiscard(): void {
    this.navigationService.goBackOr(['/home']);
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

    if (!this.listingModel().location) return;

    // Guaranteed to resolve to a real leaf by required()+validate() on
    // categoryId already having passed before submit() runs.
    const category = this.categoryService.getById(this.listingModel().categoryId ?? '');
    if (!category) return;

    await submit(this.listingForm, async () => {
      this.isLoading.set(true);
      try {
        const editing = this.editingListing();
        const listing = editing
          ? await this.updateExisting(editing, currentUser.id, category)
          : await this.listingService.create(
              toNewListingInput(this.listingModel(), currentUser.id, category),
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
  private async updateExisting(
    editing: Listing,
    ownerId: string,
    category: CategoryNode,
  ): Promise<Listing> {
    const input = toNewListingInput(this.listingModel(), ownerId, category);
    // Excluded from the spread below (rather than cast in place) because a
    // conditionally-spread optional property doesn't narrow cleanly against
    // Listing['condition'] — TS keeps widening it back to `string`.
    const { condition: newCondition, ...restInput } = input;
    const updated: Listing = {
      ...editing,
      ...restInput,
      currency: input.currency as Listing['currency'],
      // Omitted (not set to undefined) when absent — see toNewListingInput.
      // NOTE: this only stops a *new* condition from being written; if the
      // listing already had one and switches into a no-condition category,
      // the stale value stays in Firestore (updateDoc merges, it doesn't
      // clear fields a payload simply omits) until it's next overwritten.
      ...(newCondition ? { condition: newCondition as Listing['condition'] } : {}),
      status: editing.status,
      imageUrls: editing.imageUrls,
    };
    await this.listingService.update(updated);
    return updated;
  }
}
