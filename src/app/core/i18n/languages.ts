/** Single source of truth for the languages the app ships translations for. */
export const AVAILABLE_LANGUAGES = ['en', 'es'] as const;

/**
 * Applied when the browser asks for a language we don't ship, and used as
 * Transloco's fallback for any key missing from the active language.
 */
export const DEFAULT_LANGUAGE = 'es';

/** Key under which the last applied language is cached for instant startup. */
export const LANGUAGE_STORAGE_KEY = 'um-language';

/**
 * Picks the best match for the browser's preferred languages out of the ones
 * the app actually ships.
 *
 * `navigator.languages` holds full locale tags ('es-419', 'en-GB') while we
 * ship bare language codes, so matching happens on the primary subtag only.
 */
export function resolveBrowserLanguage(): string {
  const preferred =
    typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language]);

  for (const tag of preferred) {
    const primarySubtag = tag.split('-')[0].toLowerCase();
    const match = AVAILABLE_LANGUAGES.find((lang) => lang === primarySubtag);
    if (match) return match;
  }

  return DEFAULT_LANGUAGE;
}

export function isAvailableLanguage(language: string): boolean {
  return (AVAILABLE_LANGUAGES as readonly string[]).includes(language);
}

/**
 * Reads the cached language. Wrapped because `localStorage` access throws
 * outright in some privacy modes rather than returning null.
 */
export function readCachedLanguage(): string | null {
  try {
    const cached = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return cached && isAvailableLanguage(cached) ? cached : null;
  } catch {
    return null;
  }
}

export function writeCachedLanguage(language: string): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Caching is a startup optimisation only — Firestore holds the real
    // preference, so a storage failure is not worth surfacing.
  }
}
