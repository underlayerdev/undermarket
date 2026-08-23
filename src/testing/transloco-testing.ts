import { TranslocoTestingModule } from '@jsverse/transloco';
import type { TranslocoTestingOptions } from '@jsverse/transloco';
import en from '../../public/assets/i18n/en.json';
import es from '../../public/assets/i18n/es.json';

export function getTranslocoTestingModule(options: TranslocoTestingOptions = {}) {
  return TranslocoTestingModule.forRoot({
    langs: { en, es },
    translocoConfig: {
      availableLangs: ['en', 'es'],
      defaultLang: 'en',
    },
    preloadLangs: true,
    ...options,
  });
}
