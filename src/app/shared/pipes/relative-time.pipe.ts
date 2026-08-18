import { Inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';
import { formatDistanceToNowStrict, isValid } from 'date-fns';
import type { Locale } from 'date-fns';
import { enUS, es } from 'date-fns/locale';

const DATE_FNS_LOCALES: Record<string, Locale> = { en: enUS, es };

@Pipe({ name: 'relativeTime' })
export class RelativeTimePipe implements PipeTransform {
  private readonly locale: Locale;

  constructor(@Inject(LOCALE_ID) localeId: string) {
    this.locale = DATE_FNS_LOCALES[localeId] ?? enUS;
  }

  transform(value: Date | null | undefined): string {
    if (!value || !isValid(value)) return '';

    // Anything within ±5s of now is clock-drift noise (e.g. a Firestore
    // server timestamp landing a moment "in the future" relative to the
    // client clock), not a real "in 3 seconds" that would confuse a user.
    if (Math.abs(value.getTime() - Date.now()) < 5000) {
      return $localize`:@@relativeTime.justNow:just now`;
    }

    return formatDistanceToNowStrict(value, { addSuffix: true, locale: this.locale });
  }
}
