/**
 * Browser APIs jsdom does not implement but Qwik's scheduler and
 * `useVisibleTask$` strategies depend on. Stubs are inert by design:
 * intersection/matchMedia results keep visible tasks dormant so tests assert
 * deterministic static markup.
 */
if (typeof globalThis.IntersectionObserver === "undefined") {
  class IntersectionObserverStub {
    root: Element | null = null;
    rootMargin = "";
    thresholds: ReadonlyArray<number> = [];
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  (globalThis as Record<string, unknown>).IntersectionObserver =
    IntersectionObserverStub;
}

if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    }),
  });
}

if (typeof window !== "undefined" && !window.scrollTo) {
  window.scrollTo = () => {};
}
