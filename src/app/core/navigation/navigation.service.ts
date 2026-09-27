import { Location } from '@angular/common';
import { inject, Service } from '@angular/core';
import { Router } from '@angular/router';

// The Router stamps every history entry it pushes/replaces with an
// incrementing `navigationId`, starting at 1 for the very first navigation
// it performs — the one that resolved a shared/deep link straight into this
// page, with nothing of this app's before it. `history.length` looked like
// a simpler proxy for the same thing, but counts every entry in the tab's
// whole session (including ones from before the app loaded, or a
// browser/embedder quirk that pads it), so it doesn't reliably say "does
// *this app* have anywhere to go back to" — `navigationId` does.
interface RouterHistoryState {
  navigationId?: number;
}

/**
 * Wraps `Location.back()` with the fallback every "back" button in this app
 * needs: a shared/deep link can open any of these pages as the very first
 * navigation the Router has ever performed in this tab, where `back()`
 * would silently do nothing rather than leave the app.
 */
@Service()
export class NavigationService {
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  goBackOr(fallbackRoute: string[]): void {
    const state = this.location.getState() as RouterHistoryState | null;
    if (state?.navigationId === 1) {
      void this.router.navigate(fallbackRoute);
      return;
    }
    this.location.back();
  }
}
