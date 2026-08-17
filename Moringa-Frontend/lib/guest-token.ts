export function getGuestToken(): string | undefined {
  return undefined;
}

export function setGuestToken(_token: string): void {
  // Token is managed via HttpOnly cookie on the backend
}

export function clearGuestToken(): void {
  // Cookie is managed via backend; nothing to clear from client-side storage
}
