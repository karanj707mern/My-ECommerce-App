import { apiRequest } from './http';
import { setToken, clearToken, markLoggedOut } from '../storage';

export interface LoginResponse {
  message: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  accessToken: string;
}

export async function loginUser(email: string, password: string) {
  const response = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (response.accessToken) {
    setToken(response.accessToken);
  }

  return response;
}

export async function logoutUser() {
  try {
    await apiRequest('/auth/logout', { method: 'POST' });
  } finally {
    clearToken();
    markLoggedOut();
  }
}

export async function getSession() {
  return apiRequest('/auth/session');
}
