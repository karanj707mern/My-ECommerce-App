import { $, useOnWindow, useSignal, useVisibleTask$, type Signal } from "@builder.io/qwik";
import {
  AUTH_CHECKED_EVENT,
  USER_CHANGED_EVENT,
  getAuthChecked,
  getCurrentUser,
  type StoredUser,
} from "../lib/storage";

export interface AuthState {
  currentUser: Signal<StoredUser | null>;
  authChecked: Signal<boolean>;
}

/**
 * Reactive session state for pages: mirrors the `moringa:user-changed` /
 * `moringa:auth-checked` storage events into signals.
 * Qwik replacement of legacy `useCurrentUser()` + `useAuthChecked()`.
 */
export function useAuthState(): AuthState {
  const currentUser = useSignal<StoredUser | null>(null);
  const authChecked = useSignal(false);

  useVisibleTask$(() => {
    currentUser.value = getCurrentUser();
    authChecked.value = getAuthChecked();
  });

  useOnWindow(
    USER_CHANGED_EVENT,
    $(() => {
      currentUser.value = getCurrentUser();
      authChecked.value = true;
    }),
  );

  useOnWindow(
    AUTH_CHECKED_EVENT,
    $(() => {
      authChecked.value = true;
    }),
  );

  return { currentUser, authChecked };
}
