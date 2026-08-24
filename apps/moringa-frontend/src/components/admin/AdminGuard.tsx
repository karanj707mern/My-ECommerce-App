import { $, Slot, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";
import { getProfile } from "../../lib/api/auth";
import { clearToken, setCurrentUser } from "../../lib/storage";
import { useToast } from "../../hooks/useToast";
import { useAuthState } from "../../hooks/useAuthState";

/**
 * Role gate for /admin/*: verifies ADMIN via /auth/profile, shows a loading
 * spinner while checking and an access-denied panel when unauthorized.
 * Port of legacy `components/admin/AdminGuard.tsx`.
 */
export const AdminGuard = component$(() => {
  const nav = useNavigate();
  const toast = useToast();
  const { currentUser, authChecked } = useAuthState();
  const status = useSignal<"loading" | "ok" | "denied">("loading");

  const redirectToAuth = $(async (message?: string) => {
    clearToken();
    if (message) {
      void toast.showToast({
        severity: "info",
        summary: "Session expired",
        detail: message,
        life: 4000,
      });
    }
    await nav("/auth?from=" + encodeURIComponent("/admin"));
  });

  useVisibleTask$(async ({ track }) => {
    if (!track(authChecked)) return;

    if (!track(currentUser)?.id) {
      status.value = "loading";
      await redirectToAuth("Sign in as admin to access the dashboard.");
      return;
    }

    try {
      const data = (await getProfile()) as { user: Record<string, unknown> };
      setCurrentUser(data.user);

      if (data.user?.role !== "ADMIN") {
        status.value = "denied";
        return;
      }

      status.value = "ok";
    } catch {
      await redirectToAuth();
    }
  });

  if (status.value === "loading") {
    return (
      <div class="flex min-h-[60vh] w-full items-center justify-center">
        <div class="flex flex-col items-center gap-4 text-stone-500">
          <span class="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-emerald-600" />
          <p class="text-sm">Verifying admin access…</p>
        </div>
      </div>
    );
  }

  if (status.value === "denied") {
    return (
      <div class="flex min-h-[60vh] w-full items-center justify-center">
        <div class="flex flex-col items-center gap-4 text-center">
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-700 dark:text-red-300">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="h-8 w-8"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1 class="font-serif text-2xl text-[var(--text-primary)]">
            Access Denied
          </h1>
          <p class="max-w-md text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            You need admin privileges to access this area. If you believe this
            is an error, please contact support.
          </p>
          <button
            type="button"
            onClick$={() => nav("/")}
            class="btn-primary mt-4"
          >
            Back to Store
          </button>
        </div>
      </div>
    );
  }

  return <Slot />;
});

export default AdminGuard;
