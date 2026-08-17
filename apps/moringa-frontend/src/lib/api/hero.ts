import { apiRequest } from './http';

export function getHeroImages() {
  return apiRequest('/hero');
}
