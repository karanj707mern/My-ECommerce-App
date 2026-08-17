import { apiRequest } from './http';

export function getReviews(productId: number) {
  return apiRequest(`/review/product/${productId}`);
}
