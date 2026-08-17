"use client";

import { useSyncExternalStore } from "react";

const USER_KEY = "user";
const USER_CHANGED_EVENT = "moringa:user-changed";
const AUTH_CHECKED_EVENT = "moringa:auth-checked";
let cachedUserRaw: string | null | undefined = undefined;
let cachedUser: unknown = null;
let authChecked = false;

const LOGOUT_FLAG_KEY = "logout-flag";

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

function subscribeToCurrentUserChanges(onStoreChange: () => void): () => void {
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === USER_KEY) {
      onStoreChange();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener(USER_CHANGED_EVENT, onStoreChange);
    window.addEventListener("storage", handleStorageChange);
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener(USER_CHANGED_EVENT, onStoreChange);
      window.removeEventListener("storage", handleStorageChange);
    }
  };
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
  // no-op: token is HttpOnly cookie
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_KEY);
  cachedUserRaw = null;
  cachedUser = null;
  notifyCurrentUserChanged();
}

export function getCurrentUser(): { user: unknown } | null {
  if (typeof window === "undefined") return null;

  const storedUser = localStorage.getItem(USER_KEY);

  if (!storedUser) {
    cachedUserRaw = null;
    cachedUser = null;
    return null;
  }

  if (storedUser === cachedUserRaw) {
    return cachedUser as { user: unknown } | null;
  }

  try {
    cachedUserRaw = storedUser;
    cachedUser = JSON.parse(storedUser);
    return cachedUser as { user: unknown } | null;
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
  cachedUser = user;
  localStorage.setItem(USER_KEY, nextUserRaw);
  notifyCurrentUserChanged();
}

export function useCurrentUser(): unknown {
  return useSyncExternalStore(
    subscribeToCurrentUserChanges,
    getCurrentUser,
    () => null,
  );
}

function subscribeToAuthCheckedChanges(onStoreChange: () => void): () => void {
  if (typeof window !== "undefined") {
    window.addEventListener(AUTH_CHECKED_EVENT, onStoreChange);
  }
  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener(AUTH_CHECKED_EVENT, onStoreChange);
    }
  };
}

export function markAuthChecked(): void {
  authChecked = true;
  notifyAuthCheckedChanged();
}

export function getAuthChecked(): boolean {
  return authChecked;
}

export function useAuthChecked(): boolean {
  return useSyncExternalStore(
    subscribeToAuthCheckedChanges,
    getAuthChecked,
    getAuthChecked,
  );
}

const CART_KEY = "cart-items";
const CART_CHANGED_EVENT = "moringa:cart-changed";

const WISHLIST_KEY = "wishlist-items";
const WISHLIST_CHANGED_EVENT = "moringa:wishlist-changed";

let cartSaveTimer: ReturnType<typeof setTimeout> | null = null;

function notifyCartChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CART_CHANGED_EVENT));
  }
}

function notifyWishlistChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(WISHLIST_CHANGED_EVENT));
  }
}

function persistCart(
  items: { id: string | number; quantity: number; [key: string]: unknown }[],
): void {
  if (typeof window === "undefined") return;
  if (cartSaveTimer) clearTimeout(cartSaveTimer);
  cartSaveTimer = setTimeout(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    cartSaveTimer = null;
    notifyCartChanged();
  }, 200);
}

export function getCartItems(): {
  id: string | number;
  quantity: number;
  [key: string]: unknown;
}[] {
  if (typeof window === "undefined") return [];

  const storedCart = localStorage.getItem(CART_KEY);

  if (!storedCart) {
    return [];
  }

  try {
    return JSON.parse(storedCart);
  } catch {
    localStorage.removeItem(CART_KEY);
    return [];
  }
}

export function addCartItem<
  T extends { id: string | number; quantity?: number },
>(
  item: T,
): { id: string | number; quantity: number; [key: string]: unknown }[] {
  if (typeof window === "undefined") return [];

  const currentItems = getCartItems();
  const existingItem = currentItems.find((cartItem) => cartItem.id === item.id);

  if (existingItem) {
    const updatedItems = currentItems.map((cartItem) =>
      cartItem.id === item.id
        ? {
            ...cartItem,
            quantity: (cartItem.quantity as number) + (item.quantity ?? 1),
          }
        : cartItem,
    );
    persistCart(updatedItems);
    return updatedItems;
  }

  const newCartItem = { ...item, quantity: item.quantity ?? 1 } as {
    id: string | number;
    quantity: number;
    [key: string]: unknown;
  };
  const updatedItems = [...currentItems, newCartItem];
  persistCart(updatedItems);
  return updatedItems;
}

export function updateCartItemQuantity(
  itemId: string | number,
  nextQuantity: number,
): { id: string | number; quantity: number; [key: string]: unknown }[] {
  if (typeof window === "undefined") return [];

  const currentItems = getCartItems();
  const updatedItems = currentItems
    .map((item) =>
      item.id === itemId
        ? { ...item, quantity: Math.max(0, nextQuantity) }
        : item,
    )
    .filter((item) => (item.quantity as number) > 0);

  persistCart(updatedItems);
  return updatedItems;
}

export function removeCartItem(
  itemId: string | number,
): { id: string | number; quantity: number; [key: string]: unknown }[] {
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
  return getCartItems().reduce(
    (total, item) => total + (item.quantity as number),
    0,
  );
}

export function getWishlistItems(): Record<string, unknown>[] {
  if (typeof window === "undefined") return [];

  const storedWishlist = localStorage.getItem(WISHLIST_KEY);

  if (!storedWishlist) {
    return [];
  }

  try {
    const parsed = JSON.parse(storedWishlist);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(WISHLIST_KEY);
    return [];
  }
}

export function addWishlistItem(item: Record<string, unknown>): Record<string, unknown>[] {
  if (typeof window === "undefined") return [];

  const currentItems = getWishlistItems();
  const nextItems = currentItems.some((wishlistItem) => wishlistItem.id === item.id)
    ? currentItems
    : [...currentItems, item];

  localStorage.setItem(WISHLIST_KEY, JSON.stringify(nextItems));
  notifyWishlistChanged();
  return nextItems;
}

export function removeWishlistItem(itemId: string | number): Record<string, unknown>[] {
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

export function queueGuestCartItem<T extends { id: string | number }>(
  product: T,
): { id: string | number; quantity: number; [key: string]: unknown }[] {
  return addCartItem(product);
}

export function getGuestCartItems(): {
  id: string | number;
  quantity: number;
  [key: string]: unknown;
}[] {
  return getCartItems();
}

export function getGuestCartCount(): number {
  return getCartCount();
}

export function getGuestWishlistItems(): Record<string, unknown>[] {
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

export { CART_CHANGED_EVENT, notifyCartChanged, WISHLIST_CHANGED_EVENT, notifyWishlistChanged };
