/**
 * Guest identity is managed by the backend via an HttpOnly cookie.
 * The client never stores or transmits a guest token manually; `apiRequest`
 * relies on `credentials: "include"` so the browser attaches the cookie.
 */

export function getGuestToken(): string | undefined {
  return undefined;
}

export function setGuestToken(_token: string): void {
  // Token is managed via HttpOnly cookie on the backend
}

export function clearGuestToken(): void {
  // Cookie is managed via backend; nothing to clear from client-side storage
}
