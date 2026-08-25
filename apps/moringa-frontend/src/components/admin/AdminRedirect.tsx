import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";
import { getProfile } from "../../lib/api/auth";
import { clearToken, setCurrentUser } from "../../lib/storage";
import { useToast } from "../../hooks/useToast";
import { useAuthState } from "../../hooks/useAuthState";

const PREVIEW_STORAGE_KEY = "adminPreviewMode";

function readStorage(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PREVIEW_STORAGE_KEY) === "true";
}

/**
 * Keeps admins off customer-only pages by bouncing them to /admin.
 * Port of legacy `components/admin/AdminRedirect.tsx`. Renders nothing.
 */
export const AdminRedirect = component$(() => {
  const nav = useNavigate();
  const toast = useToast();
  const { currentUser, authChecked } = useAuthState();
  const status = useSignal<"loading" | "ok" | "denied">("loading");

  useVisibleTask$(async ({ track }) => {
    if (!track(authChecked)) return;

    if (!currentUser.value?.id) {
      status.value = "ok";
      return;
    }

    if (readStorage()) {
      status.value = "ok";
      return;
    }

    try {
      const data = (await getProfile()) as { user: Record<string, unknown> };
      setCurrentUser(data.user);

      if (data.user?.role === "ADMIN") {
        status.value = "denied";
        await nav(
          "/admin?orderMessage=" +
            encodeURIComponent(
              "Admin accounts manage customer queues from the dashboard.",
            ),
        );
        return;
      }

      status.value = "ok";
    } catch {
      clearToken();
      void toast.showToast({
        severity: "info",
        summary: "Session expired",
        detail: "Please sign in again.",
        life: 4000,
      });
      await nav("/auth?from=" + encodeURIComponent(window.location.pathname));
    }
  });

  if (status.value === "loading" || status.value === "denied") {
    return null;
  }

  return null;
});

export default AdminRedirect;
