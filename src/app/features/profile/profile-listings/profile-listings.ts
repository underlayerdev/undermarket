import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ErrorService } from '../../../application/services/error.service';
import { ListingService } from '../../../application/services/listing.service';
import { LISTING_REPOSITORY } from '../../../core/configuration/tokens';
import { ListingPricePipe } from '../../../shared/pipes/listing-price/listing-price.pipe';
import { createListingSlug } from '../../../shared/utils/slugify';
import type { Listing, ListingId } from '../../../domain/listing/listing.model';
import type { UserId } from '../../../domain/user/user.model';
import {
  ButtonComponent,
  CheckboxComponent,
  InputComponent,
  ModalComponent,
  SelectComponent,
  SelectableRowComponent,
  ToastService,
} from '@underlayerdev/ui';
import type { SelectOption } from '@underlayerdev/ui';
import { ListingListSkeletonComponent } from '../../../shared/listing/listing-list/listing-list-skeleton/listing-list-skeleton';

type SortOption = 'newest' | 'oldest' | 'title-asc';

const SORT_OPTIONS: { value: SortOption; labelKey: string }[] = [
  { value: 'newest', labelKey: 'profile.sortNewest' },
  { value: 'oldest', labelKey: 'profile.sortOldest' },
  { value: 'title-asc', labelKey: 'profile.sortTitleAsc' },
];

@Component({
  selector: 'um-profile-listings',
  imports: [
    RouterLink,
    ButtonComponent,
    CheckboxComponent,
    InputComponent,
    ModalComponent,
    SelectComponent,
    SelectableRowComponent,
    ListingListSkeletonComponent,
    ListingPricePipe,
    TranslocoDirective,
  ],
  providers: [ToastService],
  templateUrl: './profile-listings.html',
  styleUrl: './profile-listings.scss',
})
export class ProfileListingsComponent implements OnInit {
  readonly ownerId = input.required<UserId>();

  private readonly listingRepository = inject(LISTING_REPOSITORY);
  private readonly listingService = inject(ListingService);
  private readonly errorService = inject(ErrorService);
  private readonly toastService = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  readonly createListingSlug = createListingSlug;

  readonly listings = signal<Listing[]>([]);
  readonly isLoading = signal(true);
  readonly searchQuery = signal('');
  readonly sortOption = signal<string | null>('newest');
  readonly publishingId = signal<ListingId | null>(null);
  readonly selectedIds = signal<ReadonlySet<ListingId>>(new Set());
  readonly pendingDeleteIds = signal<ListingId[] | null>(null);
  readonly isDeleting = signal(false);

  readonly sortOptions = computed<SelectOption[]>(() => {
    this.transloco.activeLang();
    return SORT_OPTIONS.map(({ value, labelKey }) => ({
      value,
      label: this.transloco.translate(labelKey),
    }));
  });

  readonly filteredListings = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const source = query
      ? this.listings().filter((listing) => listing.title.toLowerCase().includes(query))
      : this.listings();

    const sorted = [...source];
    switch (this.sortOption()) {
      case 'oldest':
        sorted.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
      case 'title-asc':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'newest':
      default:
        sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
    }
    return sorted;
  });

  readonly hasSelection = computed(() => this.selectedIds().size > 0);

  readonly allVisibleSelected = computed(() => {
    const visible = this.filteredListings();
    return visible.length > 0 && visible.every((listing) => this.selectedIds().has(listing.id));
  });

  readonly someVisibleSelected = computed(() => {
    const visible = this.filteredListings();
    return (
      !this.allVisibleSelected() && visible.some((listing) => this.selectedIds().has(listing.id))
    );
  });

  readonly pendingDeleteCount = computed(() => this.pendingDeleteIds()?.length ?? 0);

  readonly pendingDeleteSingleTitle = computed(() => {
    const ids = this.pendingDeleteIds();
    if (!ids || ids.length !== 1) return null;
    return this.listings().find((listing) => listing.id === ids[0])?.title ?? null;
  });

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      const listings = await this.listingRepository.getByOwner(this.ownerId());
      this.listings.set(listings);
    } catch (err) {
      // Otherwise a failed fetch (e.g. a missing Firestore index) leaves
      // listings at its empty default, indistinguishable from "no listings
      // yet" — surface it instead of failing silently.
      this.toastService.error(this.errorService.toUserMessage(err));
    } finally {
      this.isLoading.set(false);
    }
  }

  isSelected(id: ListingId): boolean {
    return this.selectedIds().has(id);
  }

  toggleSelect(id: ListingId, checked: boolean): void {
    this.selectedIds.update((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  toggleSelectAll(checked: boolean): void {
    const visibleIds = this.filteredListings().map((listing) => listing.id);
    this.selectedIds.update((current) => {
      const next = new Set(current);
      for (const id of visibleIds) {
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      return next;
    });
  }

  async onPublishClick(listing: Listing): Promise<void> {
    this.publishingId.set(listing.id);
    try {
      const updated = { ...listing, status: 'active' as const };
      await this.listingService.update(updated);
      this.listings.update((listings) =>
        listings.map((item) => (item.id === updated.id ? updated : item)),
      );
      this.toastService.success(this.transloco.translate('profile.published'));
    } catch (err) {
      this.toastService.error(this.errorService.toUserMessage(err));
    } finally {
      this.publishingId.set(null);
    }
  }

  onDeleteClick(listing: Listing): void {
    this.pendingDeleteIds.set([listing.id]);
  }

  onBulkDeleteClick(): void {
    if (!this.hasSelection()) return;
    this.pendingDeleteIds.set(Array.from(this.selectedIds()));
  }

  cancelDelete(): void {
    this.pendingDeleteIds.set(null);
  }

  async confirmDelete(): Promise<void> {
    const ids = this.pendingDeleteIds();
    if (!ids || !ids.length) return;

    this.pendingDeleteIds.set(null);
    this.isDeleting.set(true);
    try {
      await Promise.all(ids.map((id) => this.listingService.delete(id)));
      this.selectedIds.update((current) => {
        const next = new Set(current);
        for (const id of ids) next.delete(id);
        return next;
      });
      // Re-fetch rather than trust an optimistic local filter, so the list
      // reflects the server's actual state after the delete.
      await this.load();
      this.toastService.success(
        ids.length > 1
          ? this.transloco.translate('profile.bulkDeleted', { value: ids.length })
          : this.transloco.translate('profile.deleted'),
      );
    } catch (err) {
      this.toastService.error(this.errorService.toUserMessage(err));
    } finally {
      this.isDeleting.set(false);
    }
  }
}
