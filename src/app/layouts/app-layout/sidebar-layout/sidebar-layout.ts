import { Component, computed, inject, input, model, output } from '@angular/core';
import { IconComponent, ListItemComponent, SidebarComponent, SidebarItem } from '@underlayerdev/ui';
import { Router } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { User } from '../../../domain/user/user.model';
import { AppSidebarItem, PRIVATE_SIDEBAR_ITEMS, PUBLIC_SIDEBAR_ITEMS } from './sidebar-items';
@Component({
  selector: 'um-sidebar-layout',
  templateUrl: './sidebar-layout.html',
  imports: [SidebarComponent, ListItemComponent, IconComponent, TranslocoDirective],
})
export class SidebarLayoutComponent {
  readonly sidebarOpen = model(false);
  readonly currentUser = input<User | null>();
  readonly currentUrl = input('');
  readonly logout = output<void>();
  readonly login = output<void>();

  private readonly router = inject(Router);
  private readonly translocoService = inject(TranslocoService);

  readonly selectedIndex = computed(() => {
    const url = this.currentUrl();
    const index = this.sidebarItems().findIndex((item) => !!item.url && url.startsWith(item.url));
    return index >= 0 ? index : 0;
  });

  readonly sidebarItems = computed((): AppSidebarItem[] => {
    const sidebarItems = this.currentUser() ? PRIVATE_SIDEBAR_ITEMS : PUBLIC_SIDEBAR_ITEMS;
    return sidebarItems.map(({ translationKey, ...item }) => ({
      ...item,
      label: this.translocoService.translate(translationKey),
    }));
  });

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
