import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { LISTING_REPOSITORY, USER_REPOSITORY } from '../../../core/configuration/tokens';
import { ListingService } from '../../../application/services/listing.service';
import type { Listing, ListingId } from '../../../domain/listing/listing.model';
import type { User } from '../../../domain/user/user.model';
import { withPendingOperations } from '../../../shared/state/with-pending-operations';
import type { ListingDetailErrorType } from './listing-detail-error/listing-detail-error';
import type { ListingActionResult } from './listing-detail-actions/listing-detail-actions';

interface ListingDetailState {
  listing: Listing | null;
  owner: User | null;
  isLoading: boolean;
  errorType: ListingDetailErrorType | null;
  // Page-level dialogs: both ListingDetailActionsComponent variants (list +
  // header menu) open the same delete/result modal, so they live here.
  deleteModalOpen: boolean;
  resultModal: ListingActionResult | null;
}

const initialState: ListingDetailState = {
  listing: null,
  owner: null,
  isLoading: true,
  errorType: null,
  deleteModalOpen: false,
  resultModal: null,
};

/**
 * The listing a detail page is showing, its owner, and the actions on it.
 * Provided on `ListingDetailComponent`, so it's created and destroyed with
 * that page and every descendant shares it without `@Input()` threading.
 *
 * Similar listings (owned by `ListingDetailSimilarItems`) and SEO (a page
 * concern) deliberately stay out. Commands throw on failure; callers decide
 * how to report it (`showResult`).
 */
export const ListingDetailStore = signalStore(
  withState(initialState),
  withProps(() => ({
    _listingRepository: inject(LISTING_REPOSITORY),
    _userRepository: inject(USER_REPOSITORY),
    _listingService: inject(ListingService),
  })),
  withPendingOperations<'publish' | 'markAsSold'>(),
  withComputed((store) => ({
    isOwner: computed(() => {
      const listing = store.listing();
      return listing !== null && store._listingService.isOwner(listing.ownerId);
    }),
    isPublishing: computed(() => store.isPending('publish')),
    isMarkingSold: computed(() => store.isPending('markAsSold')),
  })),
  withMethods((store) => {
    // A missing/failed fetch (e.g. a deleted account) just leaves the seller
    // block off the page — it must not fail the whole listing view.
    async function loadOwner(ownerId: string): Promise<void> {
      try {
        patchState(store, { owner: await store._userRepository.getById(ownerId) });
      } catch {
        patchState(store, { owner: null });
      }
    }

    async function updateStatus(listing: Listing, status: Listing['status']): Promise<void> {
      const updated: Listing = { ...listing, status };
      await store._listingService.update(updated);
      patchState(store, { listing: updated });
    }

    return {
      /**
       * Resets everything up front: the router reuses this page (and store)
       * when navigating between listings, so listing B must never render with
       * listing A's owner or pending flags still in place.
       */
      async load(id: ListingId): Promise<void> {
        patchState(store, initialState, { pendingOperations: [] });
        try {
          const listing = await store._listingRepository.getById(id);
          if (listing) {
            patchState(store, { listing });
            await loadOwner(listing.ownerId);
          } else {
            patchState(store, { errorType: 'not-found' });
          }
        } catch {
          patchState(store, { errorType: 'generic' });
        } finally {
          patchState(store, { isLoading: false });
        }
      },

      async publish(): Promise<void> {
        const listing = store.listing();
        if (!listing) return;
        await store.track('publish', () => updateStatus(listing, 'active'));
      },

      async markAsSold(): Promise<void> {
        const listing = store.listing();
        if (!listing || listing.status === 'sold') return;
        await store.track('markAsSold', () => updateStatus(listing, 'sold'));
      },

      async delete(): Promise<void> {
        const listing = store.listing();
        if (!listing) return;
        await store._listingService.delete(listing.id);
        patchState(store, { listing: null });
      },

      openDeleteModal(): void {
        patchState(store, { deleteModalOpen: true });
      },

      closeDeleteModal(): void {
        patchState(store, { deleteModalOpen: false });
      },

      showResult(result: ListingActionResult): void {
        patchState(store, { resultModal: result });
      },

      dismissResult(): void {
        patchState(store, { resultModal: null });
      },
    };
  }),
);

export type ListingDetailStore = InstanceType<typeof ListingDetailStore>;
