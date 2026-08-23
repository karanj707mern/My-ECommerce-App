/**
 * Framework-agnostic toast bus.
 *
 * Legacy used React Context + sonner's React `<Toaster/>`. Qwik cannot render
 * React trees, so toasts travel over a window custom event and the Qwik
 * `<Toaster>` component in `src/components/Toaster.tsx` renders them.
 * The `showToast` signature is identical to the legacy hook API.
 */

import { $ } from "@builder.io/qwik";

export type ToastSeverity = "success" | "error" | "warning" | "info";

export interface ToastOptions {
  severity?: ToastSeverity;
  summary?: string;
  detail?: string;
  life?: number;
}

export const TOAST_EVENT = "moringa:toast";

export interface ToastPayload extends ToastOptions {
  id: number;
}

/** Mutable holder: property mutation stays legal across QRL chunk imports. */
export const toastCounter = { next: 1 };

/**
 * Module-level QRL so any component/handler can capture it safely
 * (Qwik can serialize QRL references but not plain function values).
 */
export const showToast = $((options: ToastOptions = {}) => {
  if (typeof window === "undefined") {
    return;
  }

  const { severity = "info", summary = "", detail = "", life = 4000 } = options;

  if (import.meta.env.DEV) {
    console.log("[Toast] showToast called", {
      severity,
      summary,
      detail,
      life,
    });
  }

  window.dispatchEvent(
    new CustomEvent<ToastPayload>(TOAST_EVENT, {
      detail: { id: toastCounter.next++, severity, summary, detail, life },
    }),
  );
});
