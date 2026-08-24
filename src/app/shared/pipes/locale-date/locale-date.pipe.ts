import { inject, Pipe, PipeTransform } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { format, isValid } from 'date-fns';
import type { Locale } from 'date-fns';
import { enUS, es } from 'date-fns/locale';

const DATE_FNS_LOCALES: Record<string, Locale> = { en: enUS, es };

/**
 * Localized absolute date, following the active Transloco language.
 *
 * Angular's own DatePipe formats against LOCALE_ID, which is a static
 * injection token fixed at bootstrap — it can't follow a runtime language
 * switch, so a Spanish user would still see "Mar 15, 2024". This pipe
 * resolves the locale per-evaluation from Transloco instead, matching how
 * `relativeTime` already handles the same problem.
 *
 * The default 'PP' pattern is date-fns' localized medium date, the closest
 * equivalent to DatePipe's 'mediumDate' ("Mar 15, 2024" / "15 mar 2024").
 */
// impure: the pipe's own state (activeLang) affects output, which a pure
// pipe's change-detection wouldn't pick up on a language switch alone.
@Pipe({ name: 'localeDate', pure: false })
export class LocaleDatePipe implements PipeTransform {
  private readonly translocoService = inject(TranslocoService);

  transform(value: Date | null | undefined, pattern = 'PP'): string {
    if (!value || !isValid(value)) return '';

    const locale = DATE_FNS_LOCALES[this.translocoService.getActiveLang()] ?? enUS;
    return format(value, pattern, { locale });
  }
}
