import { $, component$, useOnWindow, useStore } from "@builder.io/qwik";
import { TOAST_EVENT, type ToastPayload } from "../lib/toast";

interface ToastItem {
  id: number;
  severity: string;
  summary: string;
  detail: string;
}

/**
 * Qwik replacement for sonner's React `<Toaster/>` (legacy ToastProvider).
 * Renders a bottom-right stack, auto-dismisses after each toast's `life`,
 * supports close buttons and severity styling.
 */
export const Toaster = component$(() => {
  const toasts = useStore<ToastItem[]>([]);

  useOnWindow(
    TOAST_EVENT,
    $((event) => {
      const payload = (event as CustomEvent<ToastPayload>).detail;
      if (!payload) return;

      const item: ToastItem = {
        id: payload.id,
        severity: payload.severity ?? "info",
        summary: payload.summary ?? "",
        detail: payload.detail ?? "",
      };

      toasts.push(item);

      setTimeout(
        () => {
          const index = toasts.findIndex((t) => t.id === item.id);
          if (index >= 0) {
            toasts.splice(index, 1);
          }
        },
        Number.isFinite(payload.life) ? (payload.life as number) : 4000,
      );
    }),
  );

  const dismiss = $((id: number) => {
    const index = toasts.findIndex((t) => t.id === id);
    if (index >= 0) {
      toasts.splice(index, 1);
    }
  });

  return (
    <div
      class="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          class={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg transition-all ${
            toast.severity === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
              : toast.severity === "error"
                ? "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
                : toast.severity === "warning"
                  ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
                  : "border-stone-200 bg-white text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          }`}
          role="status"
        >
          <span class="mt-0.5 text-base leading-none" aria-hidden="true">
            {toast.severity === "success"
              ? "✓"
              : toast.severity === "error"
                ? "✕"
                : toast.severity === "warning"
                  ? "⚠"
                  : "ℹ"}
          </span>
          <div class="min-w-0 flex-1">
            {toast.summary ? (
              <p class="text-sm font-semibold">{toast.summary}</p>
            ) : null}
            {toast.detail ? (
              <p class="mt-0.5 break-words text-sm opacity-80">
                {toast.detail}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick$={() => dismiss(toast.id)}
            aria-label="Dismiss notification"
            class="shrink-0 rounded p-1 text-current opacity-60 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              class="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
});
