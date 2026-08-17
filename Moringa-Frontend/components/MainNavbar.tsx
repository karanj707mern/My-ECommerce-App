"use client";

import { useCallback, useEffect, useState } from "react";
import SiteNav from "@/components/SiteNav";
import { getCart } from "@/lib/api/cart";
import { getWishlist } from "@/lib/api/wishlist";
import {
  useAuthChecked,
  useCurrentUser,
  CART_CHANGED_EVENT,
  WISHLIST_CHANGED_EVENT,
  getCartCount,
  getWishlistCount,
} from "@/lib/storage";
import type { User } from "@/lib/types";
import { signOutCurrentUser } from "@/lib/session";

export default function MainNavbar() {
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const currentUser = useCurrentUser() as User | null;
  const authChecked = useAuthChecked();
  const isLoggedIn = Boolean(currentUser);
  const isAdmin = currentUser?.role === "ADMIN";

  const refreshCartCount = useCallback(async () => {
    if (isAdmin) {
      setCartCount(0);
      return;
    }

    try {
      const items = await getCart();
      const count = (items as Array<{ quantity?: number }>).reduce(
        (total, item) => total + (Number(item.quantity) || 0),
        0,
      );
      setCartCount(count);
      return;
    } catch {
      // Fallback to browser storage only if the guest requests are unavailable.
    }

    setCartCount(getCartCount());
  }, [isLoggedIn, isAdmin]);

  const refreshWishlistCount = useCallback(async () => {
    if (isAdmin) {
      setWishlistCount(0);
      return;
    }

    try {
      const items = await getWishlist();
      setWishlistCount((items as Array<unknown>).length);
      return;
    } catch {
      // Fallback to browser storage only if the guest requests are unavailable.
    }

    setWishlistCount(getWishlistCount());
  }, [isLoggedIn, isAdmin]);

  useEffect(() => {
    if (!authChecked || isAdmin) {
      if (isAdmin) {
        setCartCount(0);
        setWishlistCount(0);
      }
      return;
    }

    refreshCartCount();
    refreshWishlistCount();
  }, [authChecked, isAdmin, refreshCartCount, refreshWishlistCount]);

  useEffect(() => {
    if (isAdmin) {
      return;
    }

    const handleCartChanged = () => {
      refreshCartCount();
    };

    const handleWishlistChanged = () => {
      refreshWishlistCount();
    };

    window.addEventListener(CART_CHANGED_EVENT, handleCartChanged);
    window.addEventListener(WISHLIST_CHANGED_EVENT, handleWishlistChanged);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshCartCount();
        refreshWishlistCount();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener(CART_CHANGED_EVENT, handleCartChanged);
      window.removeEventListener(WISHLIST_CHANGED_EVENT, handleWishlistChanged);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAdmin, refreshCartCount, refreshWishlistCount]);

  const handleLogout = useCallback(() => {
    signOutCurrentUser();
    setCartCount(0);
    setWishlistCount(0);
  }, []);

  return (
    <SiteNav
      cartCount={cartCount}
      wishlistCount={wishlistCount}
      isLoggedIn={isLoggedIn}
      isAdmin={isAdmin}
      onLogout={handleLogout}
    />
  );
}
