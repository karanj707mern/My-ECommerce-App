import { apiRequest } from './http';

export function getStoreSettings() {
  return apiRequest('/settings/store');
}
