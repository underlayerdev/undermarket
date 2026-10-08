import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../application/services/auth.service';
import { UserService } from '../../application/services/user.service';
import { ToastContainerComponent, ToastService } from '@underlayerdev/ui';
import { SiteFooterComponent } from '../../shared/footer/footer';
import { NavbarLayoutComponent } from './navbar-layout/navbar-layout';
import { SidebarLayoutComponent } from './sidebar-layout/sidebar-layout';
import { DockLayout } from './dock-layout/dock-layout';
@Component({
  selector: 'um-layout',
  imports: [
    RouterOutlet,
    NavbarLayoutComponent,
    ToastContainerComponent,
    SiteFooterComponent,
    TranslocoDirective,
    SidebarLayoutComponent,
    DockLayout,
  ],
  providers: [ToastService],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss',
})
export class AppLayoutComponent {
  protected readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  // Two inputs on purpose: being signed in is known from the session straight
  // away, while the profile (name, photo) arrives a moment later. Deciding
  // "signed in?" from the profile would flash the guest navigation on load.
  readonly isSignedIn = computed(() => !!this.authService.currentUser());
  readonly profile = this.userService.profile.asReadonly();

  readonly sidebarOpen = signal(false);

  readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => (event as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  async onSignOut(): Promise<void> {
    await this.authService.logout();
    await this.navigateToLogin();
  }

  navigateToLogin() {
    return this.router.navigateByUrl('/login');
  }

  onSearchSubmit(value: string): void {
    this.router.navigate(['/search'], { queryParams: { q: value || null } });
  }
}
