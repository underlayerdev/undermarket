import { inject, Pipe, PipeTransform } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { formatDistanceToNowStrict, isValid } from 'date-fns';
import type { Locale } from 'date-fns';
import { enUS, es } from 'date-fns/locale';

const DATE_FNS_LOCALES: Record<string, Locale> = { en: enUS, es };

// impure: the pipe's own state (activeLang) affects output, which a pure
// pipe's change-detection wouldn't pick up on a language switch alone.
@Pipe({ name: 'relativeTime', pure: false })
export class RelativeTimePipe implements PipeTransform {
  private readonly transloco = inject(TranslocoService);

  transform(value: Date | null | undefined): string {
    if (!value || !isValid(value)) return '';

    // Anything within ±5s of now is clock-drift noise (e.g. a Firestore
    // server timestamp landing a moment "in the future" relative to the
    // client clock), not a real "in 3 seconds" that would confuse a user.
    if (Math.abs(value.getTime() - Date.now()) < 5000) {
      return this.transloco.translate('relativeTime.justNow');
    }

    const locale = DATE_FNS_LOCALES[this.transloco.getActiveLang()] ?? enUS;
    return formatDistanceToNowStrict(value, { addSuffix: true, locale });
  }
}
