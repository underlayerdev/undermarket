import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ErrorService } from '../../../application/services/error.service';
import { ListingService } from '../../../application/services/listing.service';
import { LISTING_REPOSITORY } from '../../../core/configuration/tokens';
import { createListingSlug } from '../../../shared/utils/slugify';
import {
  LISTING_SORT_OPTIONS,
  filterListingsByQuery,
  sortListings,
} from '../../../domain/listing/listing-query.util';
import type { Listing, ListingId } from '../../../domain/listing/listing.model';
import type { UserId } from '../../../domain/user/user.model';
import {
  ModalComponent,
  ToastService,
  ButtonComponent,
  CheckboxComponent,
  IconComponent,
  SearchInputComponent,
} from '@underlayerdev/ui';
import type { SearchSuggestion, SelectOption } from '@underlayerdev/ui';
import { ListingListComponent } from '../../../shared/listing';
import { SortComponent } from '../../../shared/sort/sort';
import { addRecentSearch, getRecentSearches } from '../../../shared/search/recent-searches.util';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'um-profile-listings',
  imports: [
    ModalComponent,
    TranslocoDirective,
    ListingListComponent,
    SortComponent,
    SearchInputComponent,
    ButtonComponent,
    CheckboxComponent,
    IconComponent,
    RouterLink,
  ],
  providers: [ToastService],
  templateUrl: './profile-listings.html',
  styleUrl: './profile-listings.scss',
})
export class ProfileListingsComponent implements OnInit {
  // Separate history bucket from the public search page's own search input
  // so unrelated searches never mix in the same recent-searches list.
  private static readonly HISTORY_KEY = 'profile-listings';

  readonly ownerId = input.required<UserId>();

  private readonly listingRepository = inject(LISTING_REPOSITORY);
  private readonly listingService = inject(ListingService);
  private readonly errorService = inject(ErrorService);
  private readonly toastService = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  readonly createListingSlug = createListingSlug;
  // Title with amount of listings.
  readonly title = computed(() =>
    this.transloco.translate('profile.myListings', { value: this.listings().length }),
  );
  readonly listings = signal<Listing[]>([]);
  readonly isLoading = signal(true);
  readonly searchQuery = signal('');
  readonly sortOption = signal<string | null>('newest');
  // Bound two-way to um-listings-list via [(selection)] — it owns toggling,
  // this just needs the resulting ids for the bulk-delete bar/action.
  readonly selectedIds = signal<ReadonlySet<ListingId>>(new Set());
  readonly pendingDeleteIds = signal<ListingId[] | null>(null);
  readonly isDeleting = signal(false);

  private readonly recentSearches = signal(getRecentSearches(ProfileListingsComponent.HISTORY_KEY));
  readonly recentSearchSuggestions = computed<SearchSuggestion[]>(() =>
    this.recentSearches().map((recentQuery) => ({ value: recentQuery, label: recentQuery })),
  );

  readonly sortOptions = computed<SelectOption[]>(() => {
    this.transloco.activeLang();
    return LISTING_SORT_OPTIONS.map(({ value, labelKey }) => ({
      value,
      label: this.transloco.translate(labelKey),
    }));
  });

  // Client-side for now — load() fetches the owner's whole listing set and
  // this filters/sorts what's already in memory. Once an owner can have
  // enough listings for that fetch itself to be the bottleneck, thread
  // searchQuery()/sortOption() into listingRepository.getByOwner() instead
  // and drop this computed; filterListingsByQuery()/sortListings() already
  // live in the domain layer so the query-building logic doesn't move, just
  // where it's called from.
  readonly filteredListings = computed(() =>
    sortListings(filterListingsByQuery(this.listings(), this.searchQuery()), this.sortOption()),
  );

  // Matches filterListingsByQuery()'s own trim, so the empty-state copy
  // agrees with what's actually filtered (e.g. a whitespace-only query is
  // treated as "no search" by both).
  readonly hasSearchQuery = computed(() => this.searchQuery().trim().length > 0);

  readonly hasSelection = computed(() => this.selectedIds().size > 0);

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

  onSearchSubmit(value: string): void {
    this.recordRecentSearch(value);
  }

  onSuggestionSelected(suggestion: SearchSuggestion): void {
    this.recordRecentSearch(suggestion.value);
  }

  private recordRecentSearch(value: string): void {
    const trimmed = value.trim();
    if (!trimmed) return;
    addRecentSearch(ProfileListingsComponent.HISTORY_KEY, trimmed);
    this.recentSearches.set(getRecentSearches(ProfileListingsComponent.HISTORY_KEY));
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
