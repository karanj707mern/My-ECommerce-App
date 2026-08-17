import { apiRequest } from './http';

export function getOrders() {
  return apiRequest('/order');
}

export function createOrder(dto: Record<string, unknown>) {
  return apiRequest('/order', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}
