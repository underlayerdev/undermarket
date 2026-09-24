import { Component, computed, inject, input, output } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ButtonComponent, MenuComponent } from '@underlayerdev/ui';
import type { MenuItem } from '@underlayerdev/ui';
import { Router, RouterLink } from '@angular/router';
import { ErrorService } from '../../../../application/services/error.service';
import { createListingSlug } from '../../../../shared/utils/slugify';
import { ListingDetailStore } from '../listing-detail.store';

/** The owner-only actions, shared by the mobile bottom sheet and the desktop row. */
type ListingAction = 'edit' | 'publish' | 'markSold' | 'delete';

// Only the desktop row needs these — the bottom sheet's rows are all styled
// alike. Kept beside the action list so adding an action forces a theme choice.
const ACTION_THEMES = {
  publish: 'fill-yellow',
  edit: 'outline-purple',
  markSold: 'outline-green',
  delete: 'fill-red',
} as const satisfies Record<ListingAction, string>;

/** What `actionResult` emits — enough for the parent's modal to render itself. */
export interface ListingActionResult {
  variant: 'success' | 'error';
  message: string;
}

/**
 * The owner-only controls for a listing. Rendered twice by
 * `ListingDetailComponent` — once with `variant="menu"` (a bottom-sheet
 * trigger over the gallery; `ul-menu` itself decides bottom sheet vs
 * dropdown by breakpoint) and once with `variant="list"` (the same actions
 * as an inline desktop button row) — both instances exist in the DOM at
 * once, CSS just shows one per breakpoint, same as the markup this replaces
 * used to. Both variants read the same `ListingDetailStore` instance,
 * injected rather than passed in as a `listing`/`isOwner` input: this
 * component is a descendant of `ListingDetailComponent`, which provides the
 * store, so `inject()` here resolves to it directly.
 *
 * Whether to render at all (i.e. whether the signed-in user owns the
 * listing) is decided by the caller, the same way `ListingDetailComponent`
 * already decides whether to show this or `ListingDetailCtaComponent` — not
 * repeated here as a second, redundant check.
 *
 * `deleteRequested` and `actionResult` are the deliberate exceptions to
 * "call the store directly, no outputs" — and both for the same reason:
 * there are *two* instances of this component live at once (menu + list),
 * so anything that shows a single, page-level dialog can't be owned by
 * either instance. A confirmation dialog and a result dialog are exactly
 * that (unlike a toast, a `ul-modal` is a singleton — there's no sense in
 * which two of them could independently be "open"). Both stay with
 * `ListingDetailComponent` — the one place that isn't duplicated — and this
 * component only asks it to show one.
 */
@Component({
  selector: 'um-listing-detail-actions',
  templateUrl: 'listing-detail-actions.html',
  styleUrl: 'listing-detail-actions.scss',
  imports: [TranslocoDirective, MenuComponent, ButtonComponent, RouterLink],
})
export class ListingDetailActionsComponent {
  private readonly store = inject(ListingDetailStore);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  private readonly errorService = inject(ErrorService);

  readonly variant = input.required<'menu' | 'list'>();
  readonly deleteRequested = output<void>();
  readonly actionResult = output<ListingActionResult>();

  protected readonly isPublishing = this.store.isPublishing;
  protected readonly isMarkingSold = this.store.isMarkingSold;

  // Built once for both variants, so they can't drift apart on which
  // actions a listing currently offers. Dispatch is by `value` rather than
  // index, since which entries are present varies by status.
  protected readonly ownerActions = computed<MenuItem[]>(() => {
    this.transloco.activeLang();
    const listing = this.store.listing();
    if (!listing) return [];

    const actions: MenuItem[] = [];
    if (listing.status === 'draft') {
      actions.push({
        label: this.transloco.translate('listingDetail.publishListing'),
        value: 'publish',
        leftIcons: ['upload'],
      });
    }
    actions.push({
      label: this.transloco.translate('listingDetail.editListing'),
      value: 'edit',
      leftIcons: ['edit'],
    });
    if (listing.status !== 'sold') {
      actions.push({
        label: this.transloco.translate('listingDetail.markAsSold'),
        value: 'markSold',
        leftIcons: ['tag'],
      });
    }
    actions.push({
      label: this.transloco.translate('listingDetail.deleteListing'),
      value: 'delete',
      leftIcons: ['trash'],
    });
    return actions;
  });

  protected actionTheme(item: MenuItem): (typeof ACTION_THEMES)[ListingAction] {
    return ACTION_THEMES[item.value as ListingAction];
  }

  // A pending action keeps its place in the row and swaps to its progress
  // label, so the row's width doesn't jump while the write is in flight.
  protected isActionPending(item: MenuItem): boolean {
    return (
      (item.value === 'publish' && this.isPublishing()) ||
      (item.value === 'markSold' && this.isMarkingSold())
    );
  }

  protected actionLabel(item: MenuItem): string {
    if (item.value === 'publish' && this.isPublishing()) {
      return this.transloco.translate('listingDetail.publishing');
    }
    if (item.value === 'markSold' && this.isMarkingSold()) {
      return this.transloco.translate('listingDetail.markingSold');
    }
    return item.label;
  }

  // The desktop row binds this directly via [routerLink]; the bottom sheet's
  // items are data rather than elements a directive can sit on, so it goes
  // through onOwnerAction → navigateToEdit instead.
  protected editRoute(): string[] {
    const listing = this.store.listing();
    return listing ? ['/listings', createListingSlug(listing.title, listing.id), 'edit'] : [];
  }

  protected onOwnerAction(item: MenuItem): void {
    switch (item.value as ListingAction) {
      case 'publish':
        void this.onPublishClick();
        break;
      case 'edit':
        this.navigateToEdit();
        break;
      case 'markSold':
        void this.onMarkAsSoldClick();
        break;
      case 'delete':
        this.deleteRequested.emit();
        break;
    }
  }

  private navigateToEdit(): void {
    const listing = this.store.listing();
    if (!listing) return;
    void this.router.navigate(['/listings', createListingSlug(listing.title, listing.id), 'edit']);
  }

  protected async onPublishClick(): Promise<void> {
    try {
      await this.store.publish();
      this.actionResult.emit({
        variant: 'success',
        message: this.transloco.translate('listingDetail.published'),
      });
    } catch (err) {
      this.actionResult.emit({ variant: 'error', message: this.errorService.toUserMessage(err) });
    }
  }

  protected async onMarkAsSoldClick(): Promise<void> {
    try {
      await this.store.markAsSold();
      this.actionResult.emit({
        variant: 'success',
        message: this.transloco.translate('listingDetail.markedAsSold'),
      });
    } catch (err) {
      this.actionResult.emit({ variant: 'error', message: this.errorService.toUserMessage(err) });
    }
  }
}
