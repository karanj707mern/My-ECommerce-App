/**
 * Client-side persistent state: current user, cart and wishlist.
 *
 * Ported from legacy `lib/storage.ts`. The React `useSyncExternalStore` hooks
 * are replaced by plain functions + window custom events; Qwik components
 * subscribe via `useOnWindow`/`useVisibleTask$` (see `src/hooks/use-store.ts`).
 */

const USER_KEY = "user";
export const USER_CHANGED_EVENT = "moringa:user-changed";
export const AUTH_CHECKED_EVENT = "moringa:auth-checked";

let cachedUserRaw: string | null | undefined = undefined;
let cachedUser: StoredUser | null = null;
let authChecked = false;

const LOGOUT_FLAG_KEY = "logout-flag";

export interface StoredUser {
  user?: Record<string, unknown>;
  id?: number;
  name?: string;
  email?: string;
  role?: string;
  avatar?: string | null;
  [key: string]: unknown;
}

function notifyCurrentUserChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(USER_CHANGED_EVENT));
  }
}

function notifyAuthCheckedChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CHECKED_EVENT));
  }
}

export function markLoggedOut(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(LOGOUT_FLAG_KEY, String(Date.now()));
  }
}

export function wasRecentlyLoggedOut(ms = 5 * 60 * 1000): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(LOGOUT_FLAG_KEY);
  if (!raw) return false;
  const t = Number(raw);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= ms;
}

export function getToken(): string | null {
  return null;
}

export function setToken(_token: string | null): void {
  // no-op: token is an HttpOnly cookie managed by the backend
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_KEY);
  cachedUserRaw = null;
  cachedUser = null;
  notifyCurrentUserChanged();
}

export function getCurrentUser(): StoredUser | null {
  if (typeof window === "undefined") return null;

  const storedUser = localStorage.getItem(USER_KEY);

  if (!storedUser) {
    cachedUserRaw = null;
    cachedUser = null;
    return null;
  }

  if (storedUser === cachedUserRaw) {
    return cachedUser;
  }

  try {
    cachedUserRaw = storedUser;
    cachedUser = JSON.parse(storedUser) as StoredUser;
    return cachedUser;
  } catch {
    localStorage.removeItem(USER_KEY);
    cachedUserRaw = null;
    cachedUser = null;
    notifyCurrentUserChanged();
    return null;
  }
}

export function setCurrentUser(user: unknown): void {
  if (typeof window === "undefined") return;
  const nextUserRaw = JSON.stringify(user);
  cachedUserRaw = nextUserRaw;
  cachedUser = user as StoredUser;
  localStorage.setItem(USER_KEY, nextUserRaw);
  notifyCurrentUserChanged();
}

export function markAuthChecked(): void {
  authChecked = true;
  notifyAuthCheckedChanged();
}

export function getAuthChecked(): boolean {
  return authChecked;
}

/* ------------------------------------------------------------------ */
/* Cart                                                                */
/* ------------------------------------------------------------------ */

export type CartItemRecord = {
  id: string | number;
  quantity: number;
  [key: string]: unknown;
};

const CART_KEY = "cart-items";
export const CART_CHANGED_EVENT = "moringa:cart-changed";

const WISHLIST_KEY = "wishlist-items";
export const WISHLIST_CHANGED_EVENT = "moringa:wishlist-changed";

let cartSaveTimer: ReturnType<typeof setTimeout> | null = null;

export function notifyCartChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CART_CHANGED_EVENT));
  }
}

export function notifyWishlistChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(WISHLIST_CHANGED_EVENT));
  }
}

function persistCart(items: CartItemRecord[]): void {
  if (typeof window === "undefined") return;
  if (cartSaveTimer) clearTimeout(cartSaveTimer);
  cartSaveTimer = setTimeout(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    cartSaveTimer = null;
    notifyCartChanged();
  }, 200);
}

export function getCartItems(): CartItemRecord[] {
  if (typeof window === "undefined") return [];

  const storedCart = localStorage.getItem(CART_KEY);

  if (!storedCart) {
    return [];
  }

  try {
    const parsed = JSON.parse(storedCart) as CartItemRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(CART_KEY);
    return [];
  }
}

export function addCartItem<
  T extends { id: string | number; quantity?: number },
>(item: T): CartItemRecord[] {
  if (typeof window === "undefined") return [];

  const currentItems = getCartItems();
  const existingItem = currentItems.find((cartItem) => cartItem.id === item.id);

  if (existingItem) {
    const updatedItems = currentItems.map((cartItem) =>
      cartItem.id === item.id
        ? { ...cartItem, quantity: cartItem.quantity + (item.quantity ?? 1) }
        : cartItem,
    );
    persistCart(updatedItems);
    return updatedItems;
  }

  const newCartItem: CartItemRecord = { ...item, quantity: item.quantity ?? 1 };
  const updatedItems = [...currentItems, newCartItem];
  persistCart(updatedItems);
  return updatedItems;
}

export function updateCartItemQuantity(
  itemId: string | number,
  nextQuantity: number,
): CartItemRecord[] {
  if (typeof window === "undefined") return [];

  const currentItems = getCartItems();
  const updatedItems = currentItems
    .map((item) =>
      item.id === itemId
        ? { ...item, quantity: Math.max(0, nextQuantity) }
        : item,
    )
    .filter((item) => item.quantity > 0);

  persistCart(updatedItems);
  return updatedItems;
}

export function removeCartItem(itemId: string | number): CartItemRecord[] {
  if (typeof window === "undefined") return [];

  const currentItems = getCartItems();
  const updatedItems = currentItems.filter((item) => item.id !== itemId);
  persistCart(updatedItems);
  return updatedItems;
}

export function clearCart(): void {
  if (typeof window === "undefined") return;
  if (cartSaveTimer) clearTimeout(cartSaveTimer);
  cartSaveTimer = null;
  localStorage.removeItem(CART_KEY);
  notifyCartChanged();
}

export function getCartCount(): number {
  return getCartItems().reduce((total, item) => total + item.quantity, 0);
}

/* ------------------------------------------------------------------ */
/* Wishlist                                                            */
/* ------------------------------------------------------------------ */

export type WishlistItemRecord = Record<string, unknown>;

export function getWishlistItems(): WishlistItemRecord[] {
  if (typeof window === "undefined") return [];

  const storedWishlist = localStorage.getItem(WISHLIST_KEY);

  if (!storedWishlist) {
    return [];
  }

  try {
    const parsed = JSON.parse(storedWishlist) as WishlistItemRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(WISHLIST_KEY);
    return [];
  }
}

export function addWishlistItem(
  item: WishlistItemRecord,
): WishlistItemRecord[] {
  if (typeof window === "undefined") return [];

  const currentItems = getWishlistItems();
  const nextItems = currentItems.some(
    (wishlistItem) => wishlistItem.id === item.id,
  )
    ? currentItems
    : [...currentItems, item];

  localStorage.setItem(WISHLIST_KEY, JSON.stringify(nextItems));
  notifyWishlistChanged();
  return nextItems;
}

export function removeWishlistItem(
  itemId: string | number,
): WishlistItemRecord[] {
  if (typeof window === "undefined") return [];

  const currentItems = getWishlistItems();
  const nextItems = currentItems.filter((item) => item.id !== itemId);

  localStorage.setItem(WISHLIST_KEY, JSON.stringify(nextItems));
  notifyWishlistChanged();
  return nextItems;
}

export function clearWishlist(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(WISHLIST_KEY);
  notifyWishlistChanged();
}

export function getWishlistCount(): number {
  return getWishlistItems().length;
}

/* ------------------------------------------------------------------ */
/* Guest aliases                                                       */
/* ------------------------------------------------------------------ */

export function queueGuestCartItem<
  T extends { id: string | number; quantity?: number },
>(product: T): CartItemRecord[] {
  return addCartItem(product);
}

export function getGuestCartItems(): CartItemRecord[] {
  return getCartItems();
}

export function getGuestCartCount(): number {
  return getCartCount();
}

export function getGuestWishlistItems(): WishlistItemRecord[] {
  return getWishlistItems();
}

export function getGuestWishlistCount(): number {
  return getWishlistCount();
}

export function clearGuestCart(): void {
  clearCart();
}

export function clearGuestWishlist(): void {
  clearWishlist();
}
