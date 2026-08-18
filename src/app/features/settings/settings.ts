import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { UserService } from '../../application/services/user.service';
import { AuthService } from '../../application/services/auth.service';
import { SeoService } from '../../core/seo/seo.service';
import type { UserSettings } from '../../domain/user/user.model';
import { CardComponent, SelectComponent } from '@underlayerdev/ui';
import type { SelectOption } from '@underlayerdev/ui';

@Component({
  selector: 'um-settings',
  standalone: true,
  imports: [CardComponent, SelectComponent],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent implements OnInit {
  protected readonly userService = inject(UserService);
  protected readonly authService = inject(AuthService);
  private readonly seoService = inject(SeoService);

  readonly themeOptions: SelectOption[] = [
    { value: 'light', label: $localize`:@@settings.themeLight:Light` },
    { value: 'dark', label: $localize`:@@settings.themeDark:Dark` },
  ];

  readonly languageOptions: SelectOption[] = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
  ];

  readonly currentTheme = computed(() => this.userService.profile()?.settings.theme ?? 'light');
  readonly currentLanguage = computed(() => this.userService.profile()?.settings.language ?? 'en');

  readonly themeValue = signal<string | null>(null);
  readonly languageValue = signal<string | null>(null);

  ngOnInit(): void {
    this.seoService.setPage($localize`:@@settings.pageTitle:Settings`);
    const user = this.authService.currentUser();
    if (user) {
      this.userService.loadProfile(user.id).then(() => {
        this.themeValue.set(this.currentTheme());
        this.languageValue.set(this.currentLanguage());
      });
    }
  }

  async onThemeChange(theme: string | null): Promise<void> {
    if (!theme) return;
    const current = this.userService.profile()?.settings;
    if (!current) return;
    const updated: UserSettings = { ...current, theme: theme as 'light' | 'dark' };
    await this.userService.updateSettings(updated);
  }

  async onLanguageChange(language: string | null): Promise<void> {
    if (!language || language === this.currentLanguage()) return;
    const current = this.userService.profile()?.settings;
    if (!current) return;
    const updated: UserSettings = { ...current, language };
    await this.userService.updateSettings(updated);

    // Each locale is a fully separate static build (@angular/localize inlines
    // translations at build time) — there's no in-memory way to swap the
    // active language, so switching means navigating to the sibling locale's
    // build, preserving whatever page/path the user is currently on.
    const { pathname, search, hash } = window.location;
    const pathWithoutLocale = pathname.replace(/^\/(en|es)(\/|$)/, '/');
    window.location.href = `/${language}${pathWithoutLocale}${search}${hash}`;
  }
}
