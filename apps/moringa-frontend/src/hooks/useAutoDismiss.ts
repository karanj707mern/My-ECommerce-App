import { isSignal, useTask$, type QRL, type Signal } from "@builder.io/qwik";

/**
 * Qwik port of the legacy `useAutoDismiss` hook.
 *
 * Invokes `onDismiss` after `delay` ms whenever `value` becomes truthy.
 * Accepts either a raw value/prop or a `Signal`; the timer is cleaned up when
 * `value` changes or the owning component unmounts.
 */
export function useAutoDismiss(
  value: unknown | Signal<unknown>,
  onDismiss: QRL<() => void>,
  delay = 4000,
): void {
  useTask$(({ track, cleanup }) => {
    const current = track(() => (isSignal(value) ? value.value : value));

    if (typeof window === "undefined" || !current) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void onDismiss();
    }, delay);

    cleanup(() => clearTimeout(timeoutId));
  });
}

export default useAutoDismiss;
