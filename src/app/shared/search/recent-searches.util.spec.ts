import { addRecentSearch, getRecentSearches } from './recent-searches.util';
import { installFakeLocalStorage } from '../../../testing/fake-local-storage';

describe('recent-searches.util', () => {
  let restoreLocalStorage: () => void;

  beforeEach(() => {
    restoreLocalStorage = installFakeLocalStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    restoreLocalStorage();
  });

  it('should return an empty list when nothing is cached', () => {
    expect(getRecentSearches('listings')).toEqual([]);
  });

  it('should round-trip an added search, most-recent-first', () => {
    addRecentSearch('listings', 'chair');
    addRecentSearch('listings', 'lamp');

    expect(getRecentSearches('listings')).toEqual(['lamp', 'chair']);
  });

  it('should move a repeated search to the front instead of duplicating it', () => {
    addRecentSearch('listings', 'chair');
    addRecentSearch('listings', 'lamp');
    addRecentSearch('listings', 'chair');

    expect(getRecentSearches('listings')).toEqual(['chair', 'lamp']);
  });

  it('should ignore a blank or whitespace-only query', () => {
    addRecentSearch('listings', '   ');

    expect(getRecentSearches('listings')).toEqual([]);
  });

  it('should cap history at 8 entries, dropping the oldest', () => {
    for (let i = 1; i <= 9; i++) {
      addRecentSearch('listings', `query-${i}`);
    }

    const recent = getRecentSearches('listings');
    expect(recent).toHaveLength(8);
    expect(recent[0]).toBe('query-9');
    expect(recent).not.toContain('query-1');
  });

  it('should keep separate history per key', () => {
    addRecentSearch('listings', 'chair');
    addRecentSearch('profile-listings', 'lamp');

    expect(getRecentSearches('listings')).toEqual(['chair']);
    expect(getRecentSearches('profile-listings')).toEqual(['lamp']);
  });

  it('should return an empty list instead of throwing when storage is unavailable', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(getRecentSearches('listings')).toEqual([]);
  });

  it('should swallow write failures when storage is unavailable', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => addRecentSearch('listings', 'chair')).not.toThrow();
  });
});
