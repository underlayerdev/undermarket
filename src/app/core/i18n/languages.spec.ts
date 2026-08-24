import {
  DEFAULT_LANGUAGE,
  isAvailableLanguage,
  LANGUAGE_STORAGE_KEY,
  readCachedLanguage,
  resolveBrowserLanguage,
  writeCachedLanguage,
} from './languages';
import { installFakeLocalStorage } from '../../../testing/fake-local-storage';

function stubNavigatorLanguages(languages: string[]): void {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages);
}

describe('languages', () => {
  let restoreLocalStorage: () => void;

  beforeEach(() => {
    restoreLocalStorage = installFakeLocalStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    restoreLocalStorage();
  });

  describe('isAvailableLanguage', () => {
    it('should accept shipped languages', () => {
      expect(isAvailableLanguage('en')).toBe(true);
      expect(isAvailableLanguage('es')).toBe(true);
    });

    it('should reject languages the app does not ship', () => {
      expect(isAvailableLanguage('fr')).toBe(false);
      expect(isAvailableLanguage('')).toBe(false);
    });
  });

  describe('resolveBrowserLanguage', () => {
    it('should match a shipped language', () => {
      stubNavigatorLanguages(['es']);
      expect(resolveBrowserLanguage()).toBe('es');
    });

    it('should match on the primary subtag of a regional tag', () => {
      stubNavigatorLanguages(['es-419']);
      expect(resolveBrowserLanguage()).toBe('es');
    });

    it('should prefer the first shipped language in the browser preference order', () => {
      stubNavigatorLanguages(['fr-FR', 'es-ES', 'en-GB']);
      expect(resolveBrowserLanguage()).toBe('es');
    });

    it('should fall back to the default when nothing matches', () => {
      stubNavigatorLanguages(['fr-FR', 'de']);
      expect(resolveBrowserLanguage()).toBe(DEFAULT_LANGUAGE);
    });
  });

  describe('cached language', () => {
    it('should round-trip a shipped language', () => {
      writeCachedLanguage('es');
      expect(readCachedLanguage()).toBe('es');
    });

    it('should return null when nothing is cached', () => {
      expect(readCachedLanguage()).toBeNull();
    });

    it('should ignore a cached language the app no longer ships', () => {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, 'fr');
      expect(readCachedLanguage()).toBeNull();
    });

    it('should return null instead of throwing when storage is unavailable', () => {
      vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      expect(readCachedLanguage()).toBeNull();
    });

    it('should swallow write failures when storage is unavailable', () => {
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      expect(() => writeCachedLanguage('es')).not.toThrow();
    });
  });
});
