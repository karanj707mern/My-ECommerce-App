import { showToast, type ToastOptions } from "../lib/toast";

export type { ToastOptions } from "../lib/toast";

/**
 * Qwik equivalent of the legacy `useToast()` React Context hook.
 *
 * `showToast` is a module-level QRL (see `lib/toast.ts`), so it is safely
 * capturable inside any `onClick$`/`onSubmit$` handler without a provider.
 * Signature matches the legacy hook exactly.
 */
export function useToast(): {
  showToast: (options?: ToastOptions) => Promise<void>;
} {
  return { showToast };
}
