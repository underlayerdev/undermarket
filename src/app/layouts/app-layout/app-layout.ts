import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../application/services/auth.service';
import {
  AvatarComponent,
  DockComponent,
  DockItemComponent,
  DockItemContentSlotDirective,
  IconComponent,
  InputComponent,
  NavbarAvatarSlotDirective,
  NavbarComponent,
  NavbarLogoSlotDirective,
  NavbarSearchSlotDirective,
  SidebarComponent,
  SidebarItem,
  ToastContainerComponent,
  ToastService,
} from '@underlayerdev/ui';
import { SiteFooterComponent } from '../../shared/footer/footer';
import { NotificationsComponent } from './notifications/notifications';
import { UserMenuComponent } from './user-menu/user-menu';

/** Mobile drawer only: search lives in the navbar; Home/New/Profile live in the dock. */
type AppSidebarItem = SidebarItem & { url?: string; action?: 'sign-out' };

function buildSidebarItems(transloco: TranslocoService): AppSidebarItem[] {
  return [
    { label: transloco.translate('common.home'), value: 'home', url: '/home', leftIcons: ['home'] },
    {
      label: transloco.translate('appLayout.newListing'),
      value: 'new-listing',
      url: '/listings/new',
      leftIcons: ['plus'],
    },
    {
      label: transloco.translate('userMenu.settings'),
      value: 'settings',
      url: '/settings',
      leftIcons: ['settings'],
    },
    {
      label: transloco.translate('userMenu.signOut'),
      value: 'sign-out',
      action: 'sign-out',
      leftIcons: ['log_out'],
    },
  ];
}

@Component({
  selector: 'um-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NavbarComponent,
    NavbarLogoSlotDirective,
    NavbarSearchSlotDirective,
    NavbarAvatarSlotDirective,
    InputComponent,
    SidebarComponent,
    ToastContainerComponent,
    SiteFooterComponent,
    NotificationsComponent,
    UserMenuComponent,
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayoutComponent {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  readonly currentUser = computed(() => this.authService.currentUser());

  readonly avatarInitials = computed(() => {
    const name = this.currentUser()?.displayName;
    return name ? name.charAt(0).toUpperCase() : undefined;
  });

  readonly userImage = computed(() => this.currentUser()?.photoUrl);

  readonly sidebarOpen = signal(false);
  // Reads activeLang() so this recomputes on language switch, even though
  // translate() itself doesn't establish a reactive dependency.
  readonly sidebarItems = computed(() => {
    this.transloco.activeLang();
    return buildSidebarItems(this.transloco);
  });
  readonly searchQuery = signal('');

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
    const index = this.sidebarItems().findIndex((item) => !!item.url && url.startsWith(item.url));
    return index >= 0 ? index : 0;
  });

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  async onItemSelected(item: AppSidebarItem): Promise<void> {
    this.sidebarOpen.set(false);
    if (item.action === 'sign-out') {
      await this.authService.logout();
      await this.router.navigateByUrl('/login');
      return;
    }
    if (item.url) {
      this.router.navigateByUrl(item.url);
    }
  }

  onSearchSubmit(): void {
    const value = this.searchQuery().trim();
    this.router.navigate(['/search'], { queryParams: { q: value || null } });
  }
}
