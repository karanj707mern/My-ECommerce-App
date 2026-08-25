/**
 * SEO helpers shared by all pages.
 * Ported from legacy Next.js `generateMetadata` conventions.
 */
import type { DocumentHeadValue } from "@builder.io/qwik-city";
import { env } from "./env";

export const SITE_NAME = "Moringa Store Online";
export const DEFAULT_SITE_URL = "https://my-nest-project-pearl.vercel.app";
export const DEFAULT_OG_IMAGE =
  "https://my-nest-project-pearl.vercel.app/images/home-hero-1.webp";

export function getSiteUrl(): string {
  return env.siteUrl() || DEFAULT_SITE_URL;
}

interface SeoOptions {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  type?: "website" | "article" | "product";
}

/** Builds canonical + OpenGraph + Twitter meta consistent with legacy pages. */
export function buildHead({
  title,
  description,
  path,
  image,
  type = "website",
}: SeoOptions): DocumentHeadValue {
  const siteUrl = getSiteUrl();
  const fullTitle = path === "/" ? title : `${title} | ${SITE_NAME}`;
  const imageUrl = image || DEFAULT_OG_IMAGE;

  return {
    title,
    meta: [
      { name: "description", content: description },
      { property: "og:title", content: fullTitle },
      { property: "og:description", content: description },
      { property: "og:type", content: type },
      { property: "og:locale", content: "en_IN" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:url", content: `${siteUrl}${path}` },
      { property: "og:image", content: imageUrl },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: fullTitle },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: imageUrl },
    ],
    links: [
      { rel: "canonical", href: `${siteUrl}${path}` },
      // Store targets India (en_IN locale); declare the regional variant
      // explicitly plus a default for all other locales.
      { rel: "alternate", hreflang: "en-in", href: `${siteUrl}${path}` },
      { rel: "alternate", hreflang: "x-default", href: `${siteUrl}${path}` },
    ],
  };
}
