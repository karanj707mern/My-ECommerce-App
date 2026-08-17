import { logoutUser } from "@/lib/api/auth";
import { clearToken, markLoggedOut } from "./storage";
import { setStoredCsrfToken } from "@/lib/api/http";

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
