import React from "react";
import { render, waitFor } from "@testing-library/react";
import MainNavbar from "@/components/MainNavbar";

const mockGetCart = jest.fn();
const mockGetWishlist = jest.fn();
const mockSignOutCurrentUser = jest.fn();

const readGuestCartFromLocalStorage = () => {
  const cart = JSON.parse(localStorage.getItem("cart-items") ?? "[]");
  return Array.isArray(cart) ? cart : [];
};

const readGuestWishlistFromLocalStorage = () => {
  const wishlist = JSON.parse(localStorage.getItem("wishlist-items") ?? "[]");
  return Array.isArray(wishlist) ? wishlist : [];
};

jest.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

jest.mock("@/components/SiteNav", () => ({
  __esModule: true,
  default: ({ cartCount, wishlistCount }: { cartCount: number; wishlistCount: number }) => (
    <div data-testid="site-nav" data-cart={cartCount} data-wishlist={wishlistCount} />
  ),
}));

jest.mock("@/lib/api/cart", () => ({
  getCart: (...args: unknown[]) => {
    const cart = readGuestCartFromLocalStorage();
    return mockGetCart(...args, cart);
  },
}));

jest.mock("@/lib/api/wishlist", () => ({
  getWishlist: (...args: unknown[]) => {
    const wishlist = readGuestWishlistFromLocalStorage();
    return mockGetWishlist(...args, wishlist);
  },
}));

jest.mock("@/lib/session", () => ({
  signOutCurrentUser: (...args: unknown[]) => mockSignOutCurrentUser(...args),
}));

jest.mock("@/lib/storage", () => ({
  useAuthChecked: () => true,
  useCurrentUser: () => null,
  CART_CHANGED_EVENT: "moringa:cart-changed",
  WISHLIST_CHANGED_EVENT: "moringa:wishlist-changed",
  getCartCount: () => {
    const cart = JSON.parse(localStorage.getItem("cart-items") ?? "[]");
    return Array.isArray(cart)
      ? cart.reduce((total: number, item: { quantity?: number }) => total + (item.quantity ?? 0), 0)
      : 0;
  },
  getWishlistCount: () => {
    const wishlist = JSON.parse(localStorage.getItem("wishlist-items") ?? "[]");
    return Array.isArray(wishlist) ? wishlist.length : 0;
  },
}));

describe("MainNavbar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("cart-items", JSON.stringify([{ id: 1, quantity: 2 }, { id: 2, quantity: 1 }]));
    localStorage.setItem("wishlist-items", JSON.stringify([{ id: 1 }, { id: 2 }, { id: 3 }]));
  });

  it("uses the guest cart and wishlist API path when the user is not signed in", async () => {
    mockGetCart.mockResolvedValue([
      { id: 1, quantity: 2 },
      { id: 2, quantity: 1 },
    ]);
    mockGetWishlist.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);

    render(<MainNavbar />);

    await waitFor(() => {
      const nav = document.querySelector("[data-testid='site-nav']");
      expect(nav).toHaveAttribute("data-cart", "3");
      expect(nav).toHaveAttribute("data-wishlist", "3");
    });

    expect(mockGetCart).toHaveBeenCalled();
    expect(mockGetWishlist).toHaveBeenCalled();
  });
});
