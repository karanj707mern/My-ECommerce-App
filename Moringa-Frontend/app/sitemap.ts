import { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
  "https://my-nest-project-pearl.vercel.app";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  (process.env.NODE_ENV === "production"
    ? "https://my-nest-project-hrjn.onrender.com/api/v1"
    : "http://localhost:5000/api/v1");

const STATIC_LAST_MODIFIED = new Date("2026-07-20T00:00:00.000Z");

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  {
    url: `${SITE_URL}/`,
    lastModified: STATIC_LAST_MODIFIED,
    changeFrequency: "daily",
    priority: 1,
  },
  {
    url: `${SITE_URL}/shop`,
    lastModified: STATIC_LAST_MODIFIED,
    changeFrequency: "daily",
    priority: 0.9,
  },
  {
    url: `${SITE_URL}/about-us`,
    lastModified: STATIC_LAST_MODIFIED,
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    url: `${SITE_URL}/contact`,
    lastModified: STATIC_LAST_MODIFIED,
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    url: `${SITE_URL}/shipping`,
    lastModified: STATIC_LAST_MODIFIED,
    changeFrequency: "monthly",
    priority: 0.5,
  },
  {
    url: `${SITE_URL}/returns`,
    lastModified: STATIC_LAST_MODIFIED,
    changeFrequency: "monthly",
    priority: 0.5,
  },
  {
    url: `${SITE_URL}/privacy-policy`,
    lastModified: STATIC_LAST_MODIFIED,
    changeFrequency: "monthly",
    priority: 0.3,
  },
  {
    url: `${SITE_URL}/terms`,
    lastModified: STATIC_LAST_MODIFIED,
    changeFrequency: "monthly",
    priority: 0.3,
  },
  {
    url: `${SITE_URL}/wellness-journal`,
    lastModified: STATIC_LAST_MODIFIED,
    changeFrequency: "weekly",
    priority: 0.7,
  },
  {
    url: `${SITE_URL}/blog`,
    lastModified: STATIC_LAST_MODIFIED,
    changeFrequency: "weekly",
    priority: 0.8,
  },
];

async function getDynamicRoutes(): Promise<MetadataRoute.Sitemap> {
  const dynamicRoutes: MetadataRoute.Sitemap = [];

  try {
    const [productsRes, blogsRes] = await Promise.allSettled([
      fetch(`${API_BASE_URL}/product`),
      fetch(`${API_BASE_URL}/blog`),
    ]);

    if (productsRes.status === "fulfilled" && productsRes.value.ok) {
      const json = await productsRes.value.json();

      const products = Array.isArray(json) ? json : (json.data ?? []);

      for (const product of products) {
        if (!product.id || !product.isActive) continue;

        dynamicRoutes.push({
          url: `${SITE_URL}/product/${product.id}`,
          lastModified: product.updatedAt
            ? new Date(product.updatedAt)
            : STATIC_LAST_MODIFIED,
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }

    if (blogsRes.status === "fulfilled" && blogsRes.value.ok) {
      const json = await blogsRes.value.json();

      const blogs = Array.isArray(json) ? json : (json.data ?? []);

      for (const blog of blogs) {
        if (!blog.slug || !blog.published) continue;

        dynamicRoutes.push({
          url: `${SITE_URL}/blog/${blog.slug}`,
          lastModified:
            blog.updatedAt || blog.publishedAt
              ? new Date(blog.updatedAt || blog.publishedAt)
              : STATIC_LAST_MODIFIED,
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }
  } catch (error) {
    console.error("Sitemap generation failed:", error);
  }

  return dynamicRoutes;
}

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const dynamicRoutes = await getDynamicRoutes();

  return [...STATIC_ROUTES, ...dynamicRoutes];
}
