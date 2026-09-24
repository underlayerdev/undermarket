/**
 * jsdom implements no `matchMedia` at all, and several library components reach
 * for it: the Splide instance behind `ul-carousel` watches reduced-motion and
 * breakpoints on mount, `ul-search-input` checks a mobile breakpoint, and Angular
 * CDK's `BreakpointObserver` subscribes to whatever comes back.
 *
 * It has to be assigned outright rather than spied on, since there is nothing
 * there to spy on. The returned list carries the deprecated
 * `addListener`/`removeListener` alongside the modern `addEventListener` pair
 * because CDK still calls the legacy ones — a stub without them fails with
 * "mql.addListener is not a function". That matters beyond the spec doing the
 * stubbing: the jsdom window is shared across spec files in a run, so an
 * incomplete stub assigned in one file breaks unrelated tests in another.
 */
export function stubMatchMedia(matches = false): void {
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}
