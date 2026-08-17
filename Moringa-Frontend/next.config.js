/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: process.env.VERCEL ? undefined : "standalone",
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "5000",
      },
      {
        protocol: "https",
        hostname: "my-nest-project-hrjn.onrender.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  async rewrites() {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
      "https://my-nest-project-hrjn.onrender.com";

    return [
      {
        source: "/uploads/:path*",
        destination:
          process.env.NODE_ENV === "development"
            ? "http://localhost:5000/uploads/:path*"
            : `${backendUrl}/uploads/:path*`,
      },
    ];
  },
  async headers() {
    const isDev = process.env.NODE_ENV === "development";
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
      "https://my-nest-project-hrjn.onrender.com";
    const frontendUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      "https://my-nest-project-pearl.vercel.app";

    const connectSrc = isDev
      ? "connect-src 'self' http://localhost:5000;"
      : `connect-src 'self' ${backendUrl} ${frontendUrl} https://api.razorpay.com;`;

    const imgSrc = isDev
      ? "img-src 'self' data:;"
      : `img-src 'self' ${frontendUrl} https://*.googleusercontent.com https://res.cloudinary.com data:;`;

    const devCsp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://www.google-analytics.com https://checkout.razorpay.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' http://localhost:5000 http://localhost:* ws://localhost:*",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "frame-src https://accounts.google.com https://checkout.razorpay.com",
    ].join("; ");

    const prodCsp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://www.google-analytics.com https://checkout.razorpay.com https://vercel.live",
      "style-src 'self' 'unsafe-inline'",
      imgSrc,
      connectSrc,
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "frame-src https://accounts.google.com https://checkout.razorpay.com https://vercel.live",
    ].join("; ");

    const headers = [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: isDev ? devCsp : prodCsp,
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];

    if (!isDev) {
      headers.unshift(
        {
          source: "/images/:path*",
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=86400",
            },
          ],
        },
        {
          source: "/favicon.ico",
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=86400",
            },
          ],
        }
      );
    }

    const noIndexHeaders = [
      {
        key: "X-Robots-Tag",
        value: "noindex, nofollow, noarchive",
      },
    ];

    headers.push(
      { source: "/admin", headers: noIndexHeaders },
      { source: "/admin/:path*", headers: noIndexHeaders },
      { source: "/auth", headers: noIndexHeaders },
      { source: "/cart", headers: noIndexHeaders },
      { source: "/gift-cards", headers: noIndexHeaders },
      { source: "/orders", headers: noIndexHeaders },
      { source: "/orders/:path*", headers: noIndexHeaders },
      { source: "/profile", headers: noIndexHeaders },
      { source: "/wishlist", headers: noIndexHeaders },
    );

    return headers;
  },
};

export default nextConfig;
