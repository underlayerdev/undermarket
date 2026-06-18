import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../application/services/auth.service';
import { ErrorService } from '../../../application/services/error.service';
import { ListingService } from '../../../application/services/listing.service';
import { SeoService } from '../../../core/seo/seo.service';
import { CATEGORIES } from '../../../shared/constants/categories';
import { createListingSlug } from '../../../shared/utils/slugify';
import {
  ButtonComponent,
  FileInputComponent,
  InputComponent,
  SelectComponent,
  TextareaComponent,
  ToastService,
} from '@underlayerdev/ui';
import type { SelectOption } from '@underlayerdev/ui';

@Component({
  selector: 'app-new-listing',
  standalone: true,
  imports: [ButtonComponent, FileInputComponent, InputComponent, SelectComponent, TextareaComponent],
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

  readonly categoryOptions: SelectOption[] = CATEGORIES.map((c) => ({ value: c, label: c }));

  readonly isLoading = signal(false);
  readonly touched = signal(false);

  readonly titleValue = signal('');
  readonly descriptionValue = signal('');
  readonly priceValue = signal('');
  readonly categoryValue = signal<string | null>(null);
  readonly filesValue = signal<FileList | null>(null);

  readonly titleError = computed(() => {
    if (!this.touched()) return null;
    const v = this.titleValue().trim();
    if (!v) return 'Title is required.';
    if (v.length > 100) return 'Title must be at most 100 characters.';
    return null;
  });

  readonly descriptionError = computed(() => {
    if (!this.touched()) return null;
    const v = this.descriptionValue().trim();
    if (!v) return 'Description is required.';
    if (v.length > 2000) return 'Description must be at most 2000 characters.';
    return null;
  });

  readonly priceError = computed(() => {
    if (!this.touched()) return null;
    const n = parseFloat(this.priceValue());
    if (this.priceValue() === '' || isNaN(n)) return 'Please enter a valid price.';
    if (n < 0) return 'Price must be 0 or more.';
    return null;
  });

  readonly categoryError = computed(() => {
    if (!this.touched()) return null;
    if (!this.categoryValue()) return 'Please select a category.';
    return null;
  });

  readonly isFormValid = computed(
    () =>
      !this.titleError() &&
      !this.descriptionError() &&
      !this.priceError() &&
      !this.categoryError(),
  );

  ngOnInit(): void {
    this.seoService.setPage('Post a Listing');
  }

  async onSubmit(): Promise<void> {
    this.touched.set(true);
    if (!this.isFormValid()) return;

    const currentUser = this.authService.currentUser();
    if (!currentUser) return;

    this.isLoading.set(true);

    try {
      const files = this.filesValue();
      const fileArray = files ? Array.from(files) : [];
      const listing = await this.listingService.create(
        {
          title: this.titleValue().trim(),
          description: this.descriptionValue().trim(),
          price: parseFloat(this.priceValue()),
          category: this.categoryValue()!,
          status: 'active',
          ownerId: currentUser.id,
        },
        fileArray,
      );
      await this.router.navigate(['/listings', createListingSlug(listing.title, listing.id)]);
    } catch (err) {
      this.toastService.error(this.errorService.toUserMessage(err));
    } finally {
      this.isLoading.set(false);
    }
  }
}
