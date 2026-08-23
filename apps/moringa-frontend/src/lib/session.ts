/**
 * Session lifecycle helpers ported from legacy `lib/session.ts`.
 */
import { logoutUser } from "./api/auth";
import { clearToken, markLoggedOut } from "./storage";
import { setStoredCsrfToken } from "./api/http";

export async function signOutCurrentUser(): Promise<void> {
  markLoggedOut();

  try {
    await logoutUser();
  } catch {
    // Local session state must be cleared even if the network is down.
  } finally {
    clearToken();
    setStoredCsrfToken(null);
  }
}
