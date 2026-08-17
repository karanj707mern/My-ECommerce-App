import { apiRequest } from "./http";

export function getStoreSettings() {
  return apiRequest("/settings");
}

export function updateStoreSettings(settings: Record<string, unknown>) {
  return apiRequest("/settings", {
    method: "PATCH",
    body: JSON.stringify(settings),
  });
}
