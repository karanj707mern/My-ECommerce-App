import { apiRequest } from './http';

export function getBlogPosts() {
  return apiRequest('/blog');
}

export function getBlogPost(slug: string) {
  return apiRequest(`/blog/slug/${slug}`);
}

export function getFeaturedBlogPosts() {
  return apiRequest('/blog/featured');
}
