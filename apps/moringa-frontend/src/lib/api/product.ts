import { apiRequest } from "./http";

export function getProducts() {
  return apiRequest("/product");
}

export function getAdminProducts() {
  return apiRequest("/product/admin/all");
}

export function getNewArrivals() {
  return apiRequest("/product/new-arrivals");
}

export function getProduct(productId: string | number) {
  return apiRequest(`/product/${productId}`);
}

export function createProduct(product: Record<string, unknown>) {
  return apiRequest("/product", {
    method: "POST",
    body: JSON.stringify(product),
  });
}

export function updateProduct(
  productId: string | number,
  product: Record<string, unknown>,
) {
  return apiRequest(`/product/${productId}`, {
    method: "PATCH",
    body: JSON.stringify(product),
  });
}

export function deleteProduct(productId: string | number) {
  return apiRequest(`/product/${productId}`, {
    method: "DELETE",
  });
}

export function uploadProductImage(file: File) {
  const formData = new FormData();
  formData.append("image", file);

  return apiRequest("/product/upload-image", {
    method: "POST",
    body: formData,
  });
}
