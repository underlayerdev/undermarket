import { Component, computed, inject, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { SeoService } from '../../core/seo/seo.service';
import { SidebarComponent } from '@underlayerdev/ui';
import type { SidebarItem } from '@underlayerdev/ui';

type SettingsSidebarItem = SidebarItem & { path?: string };

@Component({
  selector: 'um-settings',
  imports: [RouterOutlet, SidebarComponent, TranslocoDirective],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class SettingsComponent implements OnInit {
  private readonly seoService = inject(SeoService);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);

  readonly sidebarItems = computed<SettingsSidebarItem[]>(() => {
    this.transloco.activeLang();
    return [
      { label: this.transloco.translate('settings.account'), path: 'account' },
      { label: this.transloco.translate('settings.display'), path: 'display' },
    ];
  });

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
    const index = this.sidebarItems().findIndex((item) => url.includes(`/settings/${item.path}`));
    return index >= 0 ? index : 0;
  });

  ngOnInit(): void {
    this.seoService.setPage(this.transloco.translate('settings.pageTitle'));
  }

  onItemSelected(item: SettingsSidebarItem): void {
    if (!item.path) return;
    this.router.navigateByUrl(`/settings/${item.path}`);
  }
}
