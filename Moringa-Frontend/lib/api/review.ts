import { apiRequest } from "./http";

export function getFeaturedReviews() {
  return apiRequest("/review/featured");
}

export function getProductReviews(productId: string | number) {
  return apiRequest(`/review/product/${productId}`);
}

export function getReviewEligibility(productId: string | number) {
  return apiRequest(`/review/product/${productId}/eligibility`);
}

export function createReview(
  productId: string | number,
  payload: Record<string, unknown>,
) {
  return apiRequest(`/review/product/${productId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createReviewComment(
  reviewId: string | number,
  payload: Record<string, unknown>,
) {
  return apiRequest(`/review/${reviewId}/comments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
