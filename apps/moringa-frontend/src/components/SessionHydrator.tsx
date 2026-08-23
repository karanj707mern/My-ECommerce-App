import { component$, useVisibleTask$ } from "@builder.io/qwik";
import { getSession } from "../lib/api/auth";
import { setStoredCsrfToken } from "../lib/api/http";
import {
  clearToken,
  markAuthChecked,
  setCurrentUser,
  wasRecentlyLoggedOut,
} from "../lib/storage";

/**
 * Qwik port of the legacy React `SessionHydrator`.
 *
 * Runs once on the client: restores the logged-in user from `/auth/session`,
 * captures the rotating CSRF token, and honors a recent logout flag so a
 * back/forward navigation does not resurrect a cleared session. Renders null.
 */
export const SessionHydrator = component$(() => {
  useVisibleTask$(async () => {
    try {
      if (wasRecentlyLoggedOut()) {
        clearToken();
        markAuthChecked();
        return;
      }

      let timedOut = false;
      const timeoutPromise = new Promise<boolean>((resolve) => {
        window.setTimeout(() => {
          timedOut = true;
          resolve(true);
        }, 10000);
      });

      const data = await Promise.race([getSession(), timeoutPromise]);

      if (timedOut || !data || typeof data !== "object") {
        markAuthChecked();
        return;
      }

      const session = data as {
        authenticated: boolean;
        user?: Record<string, unknown>;
        csrfToken?: string | null;
      };

      if (session.csrfToken) {
        setStoredCsrfToken(session.csrfToken);
      }

      if (session.authenticated && session.user) {
        setCurrentUser(session.user);
        return;
      }

      clearToken();
    } catch {
      clearToken();
    } finally {
      markAuthChecked();
    }
  });

  return null;
});
