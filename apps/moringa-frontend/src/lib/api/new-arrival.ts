import { apiRequest } from "./http";

export function getNewArrivalImages() {
  return apiRequest("/new-arrivals");
}

export function getActiveNewArrivalImages() {
  return apiRequest("/new-arrivals/active");
}

export function getNewArrivalImage(id: string | number) {
  return apiRequest(`/new-arrivals/${id}`);
}

export function createNewArrivalImage(data: Record<string, unknown>) {
  return apiRequest("/new-arrivals", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateNewArrivalImage(
  id: string | number,
  data: Record<string, unknown>,
) {
  return apiRequest(`/new-arrivals/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteNewArrivalImage(id: string | number) {
  return apiRequest(`/new-arrivals/${id}`, {
    method: "DELETE",
  });
}

export function uploadNewArrivalImage(
  file: File,
  metadata?: {
    alt?: string;
    sortOrder?: number;
    active?: boolean;
    comingSoon?: boolean;
  },
) {
  const formData = new FormData();
  formData.append("image", file);
  if (metadata?.alt !== undefined) formData.append("alt", metadata.alt);
  if (metadata?.sortOrder !== undefined)
    formData.append("sortOrder", String(metadata.sortOrder));
  if (metadata?.active !== undefined)
    formData.append("active", String(metadata.active));
  if (metadata?.comingSoon !== undefined)
    formData.append("comingSoon", String(metadata.comingSoon));
  return apiRequest("/new-arrivals/upload-image", {
    method: "POST",
    body: formData,
    headers: {},
  });
}
