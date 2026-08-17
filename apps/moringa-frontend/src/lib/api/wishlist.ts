import { apiRequest } from './http';

export function getWishlist() {
  return apiRequest('/wishlist');
}

export function addToWishlist(productId: number) {
  return apiRequest(`/wishlist/${productId}`, {
    method: 'POST',
  });
}

export function removeFromWishlist(productId: number) {
  return apiRequest(`/wishlist/${productId}`, {
    method: 'DELETE',
  });
}
