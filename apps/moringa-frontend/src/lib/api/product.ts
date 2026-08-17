import { apiRequest } from './http';

export function getProducts() {
  return apiRequest('/product');
}

export function getNewArrivals() {
  return apiRequest('/product/new-arrivals');
}

export function getProduct(productId: string | number) {
  return apiRequest(`/product/${productId}`);
}
