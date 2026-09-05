import { Component, computed, inject, input, model, output } from '@angular/core';
import { IconComponent, ListItemComponent, SidebarComponent, SidebarItem } from '@underlayerdev/ui';
import { AuthService } from '../../../application/services/auth.service';
import { Router } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

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
  selector: 'um-sidebar-layout',
  templateUrl: './sidebar-layout.html',
  imports: [SidebarComponent, ListItemComponent, IconComponent, TranslocoDirective],
})
export class SidebarLayoutComponent {
  readonly sidebarOpen = model(false);
  readonly currentUrl = input('');
  readonly logout = output<void>();
  readonly login = output<void>();

  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentUser = computed(() => this.authService.currentUser());

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

  onSignOut(): void {
    this.sidebarOpen.set(false);
    this.logout.emit();
  }
}
