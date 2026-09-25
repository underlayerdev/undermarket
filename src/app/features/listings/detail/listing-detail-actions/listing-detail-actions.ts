import { Component, computed, inject, input, output } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ButtonComponent, MenuComponent } from '@underlayerdev/ui';
import type { MenuItem } from '@underlayerdev/ui';
import { Router, RouterLink } from '@angular/router';
import { ErrorService } from '../../../../application/services/error.service';
import { ShareService } from '../../../../shared/share/share.service';
import { createListingSlug } from '../../../../shared/utils/slugify';
import { ListingDetailStore } from '../listing-detail.store';

/** The owner-only actions, shared by the mobile bottom sheet and the desktop row. */
type ListingAction = 'edit' | 'publish' | 'markSold' | 'delete';

/** A `menu`-variant-only action, offered to every viewer, not just the owner. */
type MenuOnlyAction = 'share';

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
 * The mobile action menu and the desktop owner-actions row for a listing.
 * Rendered twice by `ListingDetailComponent` — once with `variant="menu"`
 * (a bottom-sheet trigger over the gallery; `ul-menu` itself decides bottom
 * sheet vs dropdown by breakpoint) and once with `variant="list"` (the
 * owner actions as an inline desktop button row) — both instances exist in
 * the DOM at once, CSS just shows one per breakpoint. Both variants read
 * the same `ListingDetailStore` instance, injected rather than passed in as
 * a `listing`/`isOwner` input: this component is a descendant of
 * `ListingDetailComponent`, which provides the store, so `inject()` here
 * resolves to it directly.
 *
 * `variant="list"` is owner-only — whether to render it at all is decided
 * by the caller, the same way `ListingDetailComponent` decides whether to
 * show it or `ListingDetailCtaComponent` instead. `variant="menu"` renders
 * for every viewer regardless of ownership: sharing belongs to everyone,
 * and desktop already gets its own dedicated `ShareButtonComponent` rather
 * than needing this menu, so this is the only place sharing needs a
 * mobile-friendly home. Owner actions are appended to the same menu when
 * the viewer is the owner, rather than showing a second trigger.
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
  private readonly shareService = inject(ShareService);

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

  // Share first, then the owner actions when the viewer is the owner — same
  // menu, same trigger, so a non-owner still gets a "..." button to share
  // from without also seeing edit/mark-as-sold/delete for a listing that
  // isn't theirs (ownerActions() itself doesn't check ownership: it's built
  // from listing status alone, trusting the caller to gate it — true for
  // `variant="list"`, which only ever renders behind `@if (store.isOwner())`
  // in the parent template, but no longer true for this variant now that it
  // renders unconditionally).
  protected readonly menuItems = computed<MenuItem[]>(() => {
    const shareItem: MenuItem = {
      label: this.transloco.translate('listingDetail.share'),
      value: 'share' satisfies MenuOnlyAction,
      leftIcons: ['share'],
    };
    return this.store.isOwner() ? [shareItem, ...this.ownerActions()] : [shareItem];
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
  // through onActionSelected → navigateToEdit instead.
  protected editRoute(): string[] {
    const listing = this.store.listing();
    return listing ? ['/listings', createListingSlug(listing.title, listing.id), 'edit'] : [];
  }

  // Bound to both variants: the menu's `itemSelected` (which can carry
  // `share`, from every viewer, alongside the owner actions) and the
  // desktop row's per-button `buttonClick` (owner actions only, `share`
  // never reaches this from there — desktop shares via its own
  // `ShareButtonComponent` instead).
  protected onActionSelected(item: MenuItem): void {
    switch (item.value as ListingAction | MenuOnlyAction) {
      case 'share':
        void this.onShareClick();
        break;
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

  // The native share sheet (the expected path on the phones this menu
  // targets) needs no feedback of its own — the OS already showed one.
  // Only the clipboard fallback is silent on its own, so that's the only
  // outcome that reports through the shared result modal.
  protected async onShareClick(): Promise<void> {
    const listing = this.store.listing();
    if (!listing) return;

    const result = await this.shareService.share({ title: listing.title, url: location.href });
    if (result === 'copied') {
      this.actionResult.emit({
        variant: 'success',
        message: this.transloco.translate('listingDetail.linkCopied'),
      });
    } else if (result === 'unsupported') {
      this.actionResult.emit({
        variant: 'error',
        message: this.transloco.translate('listingDetail.shareUnsupported'),
      });
    }
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
