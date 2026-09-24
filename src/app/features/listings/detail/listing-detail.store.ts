import { computed, inject, Service, signal } from '@angular/core';
import { LISTING_REPOSITORY, USER_REPOSITORY } from '../../../core/configuration/tokens';
import { ListingService } from '../../../application/services/listing.service';
import type { Listing, ListingId } from '../../../domain/listing/listing.model';
import type { User } from '../../../domain/user/user.model';
import type { ListingDetailErrorType } from './listing-detail-error/listing-detail-error';

/**
 * Holds the state a listing detail page is built from — the listing itself,
 * its owner, and the pending-mutation flags for the actions that operate on
 * it (publish / mark as sold / delete). Not app-wide: this is meant to be
 * `provided` on `ListingDetailComponent` itself, so every descendant that
 * needs to read or act on "the listing this page is showing" can `inject()`
 * it directly instead of it being threaded down through `@Input()`s at every
 * level of the component split.
 *
 * Deliberately excluded, and why:
 * - `similarListings` — already owned by `ListingDetailSimilarItems`, which
 *   loads its own data off a `listing` input. Folding that in here would
 *   make this store responsible for a concern that doesn't need to be
 *   shared with anything else.
 * - Toasts — a presentation decision, and one that can legitimately differ
 *   by caller. `publish()`/`markAsSold()`/`delete()` below throw on failure
 *   (matching `ListingService.create`'s own convention) and let whichever
 *   component actually invoked the action decide how to report the result,
 *   the same way `listing-detail.ts` already handles it today.
 * - SEO (`SeoService.setListing`/`setPage`) — page metadata is a routing/view
 *   concern, not feature state; the calling component should react to
 *   `listing`/`errorType` itself rather than this store reaching for
 *   `document.title`.
 * - Delete-confirmation modal open/closed — that's ephemeral UI state for
 *   whichever component renders the confirmation dialog, not something any
 *   other descendant needs to read. `delete()` here performs the deletion
 *   itself; asking "are you sure?" first is the caller's job.
 *
 * Every signal below is exposed `.asReadonly()` — that's what actually
 * enforces one-way data flow (nothing outside this class can call `.set()`
 * on them), not a naming convention callers have to remember to respect.
 *
 * `autoProvided: false` is doing real work here, not decoration: plain
 * `@Service()` defaults to `autoProvided: true`, which is `@Service`'s own
 * shorthand for `@Injectable({ providedIn: 'root' })` — one app-wide
 * instance that outlives this page. `false` keeps this class out of the DI
 * system until something explicitly lists it in a `providers` array —
 * `ListingDetailComponent`'s — so it's created and destroyed with that
 * component instead of living for the app's entire lifetime.
 */
@Service({ autoProvided: false })
export class ListingDetailStore {
  private readonly listingRepository = inject(LISTING_REPOSITORY);
  private readonly userRepository = inject(USER_REPOSITORY);
  private readonly listingService = inject(ListingService);

  private readonly _listing = signal<Listing | null>(null);
  private readonly _owner = signal<User | null>(null);
  private readonly _isLoading = signal(true);
  private readonly _errorType = signal<ListingDetailErrorType | null>(null);
  private readonly _isPublishing = signal(false);
  private readonly _isMarkingSold = signal(false);

  readonly listing = this._listing.asReadonly();
  readonly owner = this._owner.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly errorType = this._errorType.asReadonly();
  readonly isPublishing = this._isPublishing.asReadonly();
  readonly isMarkingSold = this._isMarkingSold.asReadonly();

  readonly isOwner = computed(() => {
    const listing = this._listing();
    return listing !== null && this.listingService.isOwner(listing.ownerId);
  });

  /**
   * Fetches a listing and its owner, replacing whatever this store currently
   * holds. Resets every signal up front rather than only after the fetch
   * resolves: the router reuses `ListingDetailComponent` (and therefore this
   * store instance) when navigating between two listings — e.g. from the
   * similar-items carousel — so without an explicit reset, listing B's page
   * would briefly render with listing A's owner still in place, or with a
   * pending flag left over from something the user was doing on listing A.
   */
  async load(id: ListingId): Promise<void> {
    this._listing.set(null);
    this._owner.set(null);
    this._errorType.set(null);
    this._isPublishing.set(false);
    this._isMarkingSold.set(false);
    this._isLoading.set(true);

    try {
      const listing = await this.listingRepository.getById(id);
      if (listing) {
        this._listing.set(listing);
        await this.loadOwner(listing.ownerId);
      } else {
        this._errorType.set('not-found');
      }
    } catch {
      this._errorType.set('generic');
    } finally {
      this._isLoading.set(false);
    }
  }

  // A missing/failed fetch (e.g. a deleted account) just leaves the seller
  // block off the page — it must not fail the whole listing view.
  private async loadOwner(ownerId: string): Promise<void> {
    try {
      this._owner.set(await this.userRepository.getById(ownerId));
    } catch {
      this._owner.set(null);
    }
  }

  async publish(): Promise<void> {
    const listing = this._listing();
    if (!listing) return;

    this._isPublishing.set(true);
    try {
      const updated: Listing = { ...listing, status: 'active' };
      await this.listingService.update(updated);
      this._listing.set(updated);
    } finally {
      this._isPublishing.set(false);
    }
  }

  async markAsSold(): Promise<void> {
    const listing = this._listing();
    if (!listing || listing.status === 'sold') return;

    this._isMarkingSold.set(true);
    try {
      const updated: Listing = { ...listing, status: 'sold' };
      await this.listingService.update(updated);
      this._listing.set(updated);
    } finally {
      this._isMarkingSold.set(false);
    }
  }

  async delete(): Promise<void> {
    const listing = this._listing();
    if (!listing) return;

    await this.listingService.delete(listing.id);
    this._listing.set(null);
  }
}
