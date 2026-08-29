import { Component, inject, linkedSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { LanguageService } from '../../../application/services/language.service';
import { ButtonComponent, IconComponent, SelectComponent } from '@underlayerdev/ui';
import type { SelectOption } from '@underlayerdev/ui';

@Component({
  selector: 'um-settings-display',
  imports: [ButtonComponent, IconComponent, RouterLink, SelectComponent, TranslocoDirective],
  templateUrl: './settings-display.html',
  styleUrl: './settings-display.scss',
})
export class SettingsDisplayComponent {
  private readonly languageService = inject(LanguageService);
  private readonly transloco = inject(TranslocoService);

  readonly languageOptions: SelectOption[] = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
  ];

  /**
   * The active language is the single source of truth: LanguageService applies
   * the stored preference as soon as the profile loads, so tracking it here
   * keeps the select correct without waiting on a profile fetch of our own.
   * linkedSignal (not computed) because ul-select writes back through [(value)].
   */
  readonly languageValue = linkedSignal<string | null>(() => this.transloco.activeLang());

  async onLanguageChange(language: string | null): Promise<void> {
    if (!language || language === this.transloco.getActiveLang()) return;
    await this.languageService.setLanguage(language);
  }
}
