import { apiRequest } from "./http";

export function createCheckoutSession(address: Record<string, unknown>) {
  return apiRequest("/order/checkout-session", {
    method: "POST",
    body: JSON.stringify(address),
  });
}

export function previewCheckout(payload: Record<string, unknown>) {
  return apiRequest("/order/preview", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function verifyPayment(paymentData: Record<string, unknown>) {
  return apiRequest("/order/verify-payment", {
    method: "POST",
    body: JSON.stringify(paymentData),
  });
}

export function createOrder(payload: Record<string, unknown>) {
  return apiRequest("/order", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getOrders() {
  return apiRequest("/order");
}

export function getOpenOrders() {
  return apiRequest("/order/admin/open");
}

export function getCancelledOrders() {
  return apiRequest("/order/admin/cancelled");
}

export function getAdminIssues() {
  return apiRequest("/order/admin/issues");
}

export function updateOrderStatus(
  orderId: string | number,
  payload: Record<string, unknown>,
) {
  return apiRequest(`/order/${orderId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function cancelOrder(orderId: string | number) {
  return apiRequest(`/order/${orderId}`, {
    method: "DELETE",
  });
}

export function createOrderIssue(
  orderId: string | number,
  payload: Record<string, unknown>,
) {
  return apiRequest(`/order/${orderId}/issues`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateOrderIssue(
  issueId: string | number,
  payload: Record<string, unknown>,
) {
  return apiRequest(`/order/issues/${issueId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function getOrderInvoice(orderId: string | number) {
  return apiRequest(`/order/${orderId}/invoice`);
}

export function refundOrder(
  orderId: string | number,
  payload: {
    manual?: boolean;
    method?: string;
    reference?: string;
    notes?: string;
  } = {},
) {
  return apiRequest(`/order/admin/${orderId}/refund`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
