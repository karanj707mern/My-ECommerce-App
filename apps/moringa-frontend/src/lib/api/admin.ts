import { apiRequest } from './http';

export function getAdminDashboard() {
  return apiRequest('/admin/dashboard');
}
