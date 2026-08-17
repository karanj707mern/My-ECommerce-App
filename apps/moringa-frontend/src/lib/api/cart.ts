import { apiRequest } from './http';

export function getUserCart() {
  return apiRequest('/cart');
}

export function addToCart(productId: number, quantity = 1) {
  return apiRequest('/cart', {
    method: 'POST',
    body: JSON.stringify({ productId, quantity }),
  });
}

export function removeFromCart(cartItemId: number) {
  return apiRequest(`/cart/${cartItemId}`, {
    method: 'DELETE',
  });
}
