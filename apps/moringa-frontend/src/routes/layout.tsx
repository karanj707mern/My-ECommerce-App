import { component$, Slot } from "@builder.io/qwik";
import { ErrorBoundary } from "@builder.io/qwik-city";

/**
 * Root route layout. Wraps every segment (storefront + admin).
 *
 * Uses qwik-city's `<ErrorBoundary>` component (this version exposes a
 * component with `fallback$` rather than the per-route export convention).
 * The fallback mimics the legacy React class boundary in
 * `components/ErrorBoundary.tsx`: same themed card, warning glyph and
 * "Refresh page" recovery action.
 */
export default component$(() => {
  return (
    <ErrorBoundary
      fallback$={(error: unknown) => (
        <div class="flex min-h-[50vh] items-center justify-center px-4">
          <div class="max-w-md rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-8 text-center shadow-sm">
            <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--danger-bg)]">
              <svg
                class="h-6 w-6 text-[var(--danger-text)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 class="font-serif text-2xl text-[var(--text-primary)]">
              Something went wrong
            </h2>
            <p class="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              We encountered an unexpected error. Please try refreshing the
              page.
            </p>
            <p
              class="mt-2 break-words text-xs text-[var(--text-muted)]"
              role="status"
            >
              {(error as Error)?.message || "Unknown error"}
            </p>
            <button
              type="button"
              onClick$={() => {
                window.location.reload();
              }}
              class="btn-primary mt-6"
            >
              Refresh page
            </button>
          </div>
        </div>
      )}
    >
      <Slot />
    </ErrorBoundary>
  );
});
