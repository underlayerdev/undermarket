import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../application/services/auth.service';
import {
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

/** Mobile drawer only: Home + New Listing. Search lives in the navbar; Profile/Settings/Sign out live in the avatar menu. */
const SIDEBAR_ITEMS: (SidebarItem & { url: string })[] = [
  { label: 'Home', value: 'home', url: '/home', leftIcons: ['home'] },
  { label: 'New Listing', value: 'new-listing', url: '/listings/new', leftIcons: ['plus'] },
];

@Component({
  selector: 'um-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
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
  ],
  providers: [ToastService],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayoutComponent {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentUser = computed(() => this.authService.currentUser());

  readonly avatarInitials = computed(() => {
    const name = this.currentUser()?.displayName;
    return name ? name.charAt(0).toUpperCase() : undefined;
  });

  readonly userImage = computed(() => this.currentUser()?.photoUrl);

  readonly sidebarOpen = signal(false);
  readonly sidebarItems = SIDEBAR_ITEMS;
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
    const index = SIDEBAR_ITEMS.findIndex((item) => url.startsWith(item.url));
    return index >= 0 ? index : 0;
  });

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  onItemSelected(item: SidebarItem & { url?: string }): void {
    if (item.url) {
      this.router.navigateByUrl(item.url);
    }
    this.sidebarOpen.set(false);
  }

  onSearchSubmit(): void {
    const value = this.searchQuery().trim();
    this.router.navigate(['/search'], { queryParams: { q: value || null } });
  }
}
