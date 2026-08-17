"use client";

import { useEffect } from "react";
import { getSession } from "@/lib/api/auth";
import {
  clearToken,
  markAuthChecked,
  setCurrentUser,
  wasRecentlyLoggedOut,
} from "@/lib/storage";
import { setStoredCsrfToken } from "@/lib/api/http";

export default function SessionHydrator() {
  useEffect(() => {
    const hydrateUser = async () => {
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

        const data = (await Promise.race([getSession(), timeoutPromise])) as {
          authenticated: boolean;
          user?: Record<string, unknown>;
          csrfToken?: string | null;
        };

        if (timedOut) {
          markAuthChecked();
          return;
        }

        if (data.csrfToken) {
          setStoredCsrfToken(data.csrfToken);
        }

        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
          return;
        }

        clearToken();
      } catch {
        clearToken();
      } finally {
        markAuthChecked();
      }
    };

    hydrateUser();
  }, []);

  return null;
}
