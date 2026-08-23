/**
 * Environment-aware URL resolution for the API, assets and the socket server.
 * Ported from legacy `lib/config.ts`; Next.js `NEXT_PUBLIC_*` variables became
 * Vite `VITE_*` variables.
 */

function trimTrailingSlash(value: string | undefined): string | undefined {
  return value ? value.replace(/\/$/, "") : undefined;
}

function getServerApiBaseUrl(): string {
  const explicit = import.meta.env.VITE_API_BASE_URL?.trim();
  if (explicit) return explicit;

  const siteUrl = trimTrailingSlash(import.meta.env.VITE_SITE_URL?.trim());
  if (siteUrl) {
    return `${siteUrl}/api/v1`;
  }

  return "http://localhost:5000/api/v1";
}

function getClientApiBaseUrl(): string {
  const explicit = import.meta.env.VITE_API_BASE_URL?.trim();
  if (explicit) return explicit;

  if (
    import.meta.env.DEV ||
    (typeof window !== "undefined" && window.location.hostname === "localhost")
  ) {
    return "http://localhost:5000/api/v1";
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/v1`;
  }

  return getServerApiBaseUrl();
}

export const API_BASE_URL: string =
  typeof window !== "undefined" ? getClientApiBaseUrl() : getServerApiBaseUrl();

const CLOUDINARY_CLOUD_NAME =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.trim() ?? "";

export const ASSET_BASE_URL: string =
  CLOUDINARY_CLOUD_NAME && CLOUDINARY_CLOUD_NAME !== "your-cloud-name"
    ? `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}`
    : API_BASE_URL.replace(/\/api\/v\d+\/?$/, "") ||
      import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/v\d+\/?$/, "") ||
      "http://localhost:5000";

export const SOCKET_BASE_URL = ASSET_BASE_URL;

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1' height='1'><rect width='1' height='1' fill='none'/></svg>";

export function resolveImageUrl(value: unknown): string {
  if (typeof value !== "string") {
    return PLACEHOLDER_IMAGE;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return PLACEHOLDER_IMAGE;
  }

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  if (trimmed.startsWith("/uploads/")) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  return new URL(trimmed, ASSET_BASE_URL).toString();
}
