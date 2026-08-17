import { apiRequest } from "./http";

export function getBlogPosts() {
  return apiRequest("/blog");
}

export function getBlogPost(slug: string) {
  return apiRequest(`/blog/${encodeURIComponent(slug)}`);
}

export function getAllBlogPosts() {
  return apiRequest("/blog/admin/all");
}

export function createBlogPost(post: Record<string, unknown>) {
  return apiRequest("/blog", {
    method: "POST",
    body: JSON.stringify(post),
  });
}

export function updateBlogPost(
  id: string | number,
  post: Record<string, unknown>,
) {
  return apiRequest(`/blog/${id}`, {
    method: "PATCH",
    body: JSON.stringify(post),
  });
}

export function deleteBlogPost(id: string | number) {
  return apiRequest(`/blog/${id}`, {
    method: "DELETE",
  });
}

export function uploadBlogImage(file: File) {
  const formData = new FormData();
  formData.append("image", file);

  return apiRequest("/blog/upload-image", {
    method: "POST",
    body: formData,
  });
}
