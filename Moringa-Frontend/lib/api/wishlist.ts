import { apiRequest } from "./http";

const WISHLIST_TIMEOUT = 8000;

export async function getWishlist() {
  return apiRequest("/wishlist", { timeout: WISHLIST_TIMEOUT });
}

export async function addToWishlist(productId: string | number) {
  return apiRequest(`/wishlist/${productId}`, {
    method: "POST",
  });
}

export async function removeFromWishlist(productId: string | number) {
  return apiRequest(`/wishlist/${productId}`, {
    method: "DELETE",
  });
}

export async function mergeGuestWishlist() {
  return apiRequest("/wishlist/guest/merge", {
    method: "POST",
  });
}
