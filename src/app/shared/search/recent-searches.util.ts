const MAX_RECENT_SEARCHES = 8;

function storageKey(key: string): string {
  return `um-recent-searches:${key}`;
}

/**
 * Reads the recent searches cached for `key`, most-recent-first. Wrapped
 * because `localStorage` access throws outright in some privacy modes
 * rather than returning null.
 */
export function getRecentSearches(key: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((entry) => typeof entry === 'string')
      ? parsed
      : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(key: string, query: string): void {
  const trimmed = query.trim();
  if (!trimmed) return;
  try {
    const existing = getRecentSearches(key).filter((entry) => entry !== trimmed);
    const next = [trimmed, ...existing].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(storageKey(key), JSON.stringify(next));
  } catch {
    // Recent-search history is a convenience only — not worth surfacing a failure.
  }
}
