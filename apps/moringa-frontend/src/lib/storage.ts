const TOKEN_KEY = 'access_token';

export function setToken(token: string) {
  if (typeof document !== 'undefined') {
    document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${60 * 60}`;
  }
}

export function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${TOKEN_KEY}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() ?? null;
  }
  return null;
}

export function clearToken() {
  if (typeof document !== 'undefined') {
    document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
  }
}

let loggedOut = false;

export function markLoggedOut() {
  loggedOut = true;
}

export function isLoggedOut() {
  return loggedOut;
}
