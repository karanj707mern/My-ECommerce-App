import { apiRequest } from "./http";

export function getHeroImages() {
  return apiRequest("/hero");
}

export function getActiveHeroImages() {
  return apiRequest("/hero/active");
}

export function getHeroImage(id: string | number) {
  return apiRequest(`/hero/${id}`);
}

export function getFirstActiveHeroImage() {
  return apiRequest<{ url: string; alt?: string }[]>("/hero/active").then(
    (images) => (Array.isArray(images) && images[0]) || null,
  );
}

export function createHeroImage(data: Record<string, unknown>) {
  return apiRequest("/hero", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateHeroImage(
  id: string | number,
  data: Record<string, unknown>,
) {
  return apiRequest(`/hero/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteHeroImage(id: string | number) {
  return apiRequest(`/hero/${id}`, {
    method: "DELETE",
  });
}

export function uploadHeroImage(
  file: File,
  metadata?: { alt?: string; sortOrder?: number; active?: boolean },
) {
  const formData = new FormData();
  formData.append("image", file);
  if (metadata?.alt !== undefined) formData.append("alt", metadata.alt);
  if (metadata?.sortOrder !== undefined)
    formData.append("sortOrder", String(metadata.sortOrder));
  if (metadata?.active !== undefined)
    formData.append("active", String(metadata.active));
  return apiRequest("/hero/upload-image", {
    method: "POST",
    body: formData,
    headers: {},
  });
}
