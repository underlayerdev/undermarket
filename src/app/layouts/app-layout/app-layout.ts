import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../application/services/auth.service';
import {
  AvatarComponent,
  DockComponent,
  DockItemComponent,
  DockItemContentSlotDirective,
  IconComponent,
  ToastContainerComponent,
  ToastService,
} from '@underlayerdev/ui';
import { SiteFooterComponent } from '../../shared/footer/footer';
import { getInitials } from '../../shared/utils/user-display';
import { NotificationsComponent } from './notifications/notifications';
import { NavbarLayoutComponent } from './navbar-layout/navbar-layout';
import { SidebarLayoutComponent } from './sidebar-layout/sidebar-layout';
@Component({
  selector: 'um-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NavbarLayoutComponent,
    ToastContainerComponent,
    SiteFooterComponent,
    NotificationsComponent,
    DockComponent,
    DockItemComponent,
    DockItemContentSlotDirective,
    IconComponent,
    AvatarComponent,
    TranslocoDirective,
    SidebarLayoutComponent,
  ],
  providers: [ToastService],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss',
})
export class AppLayoutComponent {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentUser = computed(() => this.authService.currentUser());

  readonly avatarInitials = computed(() => {
    const name = this.currentUser()?.displayName;
    return name ? getInitials(name) : undefined;
  });

  readonly userImage = computed(() => this.currentUser()?.photoUrl);

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
