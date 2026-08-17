import { apiRequest } from "./http";

export async function getCart() {
  return apiRequest("/cart");
}

export async function addCartItem(productId: string | number, quantity = 1) {
  return apiRequest("/cart", {
    method: "POST",
    body: JSON.stringify({ productId, quantity }),
  });
}

export async function updateCartItem(
  cartItemId: string | number,
  quantity: number,
) {
  return apiRequest(`/cart/${cartItemId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
}

export async function removeCartItem(cartItemId: string | number) {
  return apiRequest(`/cart/${cartItemId}`, {
    method: "DELETE",
  });
}

export async function clearCart() {
  return apiRequest("/cart", {
    method: "DELETE",
  });
}

export async function mergeGuestCart() {
  return apiRequest("/cart/guest/merge", {
    method: "POST",
  });
}
