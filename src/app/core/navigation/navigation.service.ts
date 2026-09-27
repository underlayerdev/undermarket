import { Location } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Wraps `Location.back()` with the fallback every "back" button in this app
 * needs: a shared/deep link can open any of these pages as the tab's very
 * first history entry (`history.length === 1`), where `back()` would
 * silently do nothing rather than leave the app.
 */
@Injectable({ providedIn: 'root' })
export class NavigationService {
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  goBackOr(fallbackRoute: string[]): void {
    if (window.history.length <= 1) {
      void this.router.navigate(fallbackRoute);
      return;
    }
    this.location.back();
  }
}
