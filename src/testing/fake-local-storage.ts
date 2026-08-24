/**
 * Installs an in-memory `localStorage` for the duration of a spec.
 *
 * The unit-test environment runs without a real one (`globalThis.localStorage`
 * is undefined), so specs that exercise cached values have to provide it.
 * Returns a teardown function that restores the original value.
 */
export function installFakeLocalStorage(): () => void {
  const store = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

  const fake: Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'clear'> = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, String(value)),
    removeItem: (key) => void store.delete(key),
    clear: () => store.clear(),
  };

  Object.defineProperty(globalThis, 'localStorage', {
    value: fake,
    configurable: true,
    writable: true,
  });

  return () => {
    if (original) {
      Object.defineProperty(globalThis, 'localStorage', original);
    } else {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    }
  };
}
