import { apiRequest } from "./http";

export function loginUser(email: string, password: string) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function loginWithGoogle(credential: string) {
  return apiRequest("/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
}

export function registerUser(name: string, email: string, password: string) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export function verifyEmail(token: string) {
  return apiRequest("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export function resendVerification(email: string) {
  return apiRequest("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function forgotPassword(email: string) {
  return apiRequest("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, password: string) {
  return apiRequest("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export function getProfile() {
  return apiRequest("/auth/profile");
}

export function listUserAddresses() {
  return apiRequest("/auth/addresses");
}

export function getSession() {
  return apiRequest("/auth/session", {
    skipAuthRefresh: true,
  });
}

export function logoutUser() {
  return apiRequest("/auth/logout", {
    method: "POST",
  });
}

export function updateProfile(profile: Record<string, unknown>) {
  return apiRequest("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(profile),
  });
}

export function uploadAvatar(formData: FormData) {
  return apiRequest("/auth/upload-avatar", {
    method: "POST",
    body: formData,
    headers: {},
  });
}

export function createUserAddress(address: Record<string, unknown>) {
  return apiRequest("/auth/addresses", {
    method: "POST",
    body: JSON.stringify(address),
  });
}

export function updateUserAddress(
  id: string | number,
  address: Record<string, unknown>,
) {
  return apiRequest(`/auth/addresses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(address),
  });
}

export function deleteUserAddress(id: string | number) {
  return apiRequest(`/auth/addresses/${id}`, {
    method: "DELETE",
  });
}
