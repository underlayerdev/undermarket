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
  ListItemComponent,
  SidebarComponent,
  SidebarItem,
  ToastContainerComponent,
  ToastService,
} from '@underlayerdev/ui';
import { SiteFooterComponent } from '../../shared/footer/footer';
import { getInitials } from '../../shared/utils/user-display';
import { NotificationsComponent } from './notifications/notifications';
import { NavbarLayoutComponent } from './navbar-layout/navbar-layout';

/** Mobile drawer only: search lives in the navbar; Home/New/Profile live in the dock. Sign-out lives in the drawer footer, not this list. */
type AppSidebarItem = SidebarItem & { url?: string };
type SidebarItemMeta = Omit<AppSidebarItem, 'label'> & { translationKey: string };

const SIDEBAR_ITEMS_META: SidebarItemMeta[] = [
  { translationKey: 'common.home', value: 'home', url: '/home', leftIcons: ['home'] },
  {
    translationKey: 'userMenu.settings',
    value: 'settings',
    url: '/settings',
    leftIcons: ['settings'],
  },
];

@Component({
  selector: 'um-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    SidebarComponent,
    NavbarLayoutComponent,
    ListItemComponent,
    ToastContainerComponent,
    SiteFooterComponent,
    NotificationsComponent,
    DockComponent,
    DockItemComponent,
    DockItemContentSlotDirective,
    IconComponent,
    AvatarComponent,
    TranslocoDirective,
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

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => (event as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly selectedIndex = computed(() => {
    const url = this.currentUrl();
    const index = SIDEBAR_ITEMS_META.findIndex((item) => !!item.url && url.startsWith(item.url));
    return index >= 0 ? index : 0;
  });

  getSidebarItems(t: (key: string) => string): AppSidebarItem[] {
    return SIDEBAR_ITEMS_META.map(({ translationKey, ...item }) => ({
      ...item,
      label: t(translationKey),
    }));
  }

  onItemSelected(item: AppSidebarItem): void {
    this.sidebarOpen.set(false);
    if (item.url) {
      this.router.navigateByUrl(item.url);
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  async onSignOut(): Promise<void> {
    this.sidebarOpen.set(false);
    await this.authService.logout();
    await this.router.navigateByUrl('/login');
  }

  onSearchSubmit(value: string): void {
    this.router.navigate(['/search'], { queryParams: { q: value || null } });
  }
}
