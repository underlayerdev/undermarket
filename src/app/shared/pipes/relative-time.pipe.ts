import { Pipe, PipeTransform } from '@angular/core';
import { formatDistanceToNowStrict, isValid } from 'date-fns';
// No i18n is configured in this app yet (no LOCALE_ID override, no
// registerLocaleData) — enUS matches Angular's own default locale. If
// i18n is added later, resolve the date-fns locale from LOCALE_ID here
// instead of hardcoding it.
import { enUS } from 'date-fns/locale';

@Pipe({ name: 'relativeTime' })
export class RelativeTimePipe implements PipeTransform {
  transform(value: Date | null | undefined): string {
    if (!value || !isValid(value)) return '';

    // Anything within ±5s of now is clock-drift noise (e.g. a Firestore
    // server timestamp landing a moment "in the future" relative to the
    // client clock), not a real "in 3 seconds" that would confuse a user.
    if (Math.abs(value.getTime() - Date.now()) < 5000) return 'just now';

    return formatDistanceToNowStrict(value, { addSuffix: true, locale: enUS });
  }
}
