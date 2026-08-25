import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

/**
 * Qwik port of legacy `components/GoToTop.tsx`.
 *
 * Neon floating action button that appears after scrolling 400px and smooth
 * scrolls back to the top.
 */
export const GoToTop = component$(() => {
  const visible = useSignal(false);

  useVisibleTask$(({ cleanup }) => {
    const handleScroll = () => {
      visible.value = window.scrollY > 400;
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    cleanup(() => window.removeEventListener("scroll", handleScroll));
  });

  if (!visible.value) {
    return null;
  }

  return (
    <button
      type="button"
      onClick$={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Go to top"
      title="Go to top"
      class="neon-fab fixed bottom-24 right-6 z-50 inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--fab-border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-[0_0_10px_rgba(34,211,238,0.5),0_0_20px_rgba(34,211,238,0.2)]"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-4 w-4"
        aria-hidden="true"
      >
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  );
});
