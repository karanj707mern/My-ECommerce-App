import type { INestiaConfig } from "@nestia/sdk";

/**
 * Nestia SDK + OpenAPI generator.
 *   npx nestia sdk     -> ../../libs/sdk/src/api
 *   npx nestia swagger -> ../../libs/sdk/swagger.json
 *
 * Static-glob input keeps CI hermetic (no app boot / DB required).
 * Excluded controllers expose surfaces static analysis cannot reproduce
 * (@fastify/multipart augmentations, SSE streams, deep Prisma intersections);
 * those paths remain on the frontend http.ts layer until DTO-wrapped.
 * clone:true inlines DTOs so the SDK is self-contained.
 */
const config: INestiaConfig = {
  input: {
    include: ["src/**/*.controller.ts"],
    exclude: [
      "src/auth/auth.controller.ts",
      "src/product/product.controller.ts",
      "src/blog/blog.controller.ts",
      "src/order/order.controller.ts",
      "src/settings/settings.controller.ts",
      "src/user/user.controller.ts",
      "src/wishlist/wishlist.controller.ts",
      "src/review/review.controller.ts",
      "src/admin/admin.controller.ts",
      "src/analytics/analytics.controller.ts",
      "src/audit/audit.controller.ts",
      "src/payment/payment-webhook.controller.ts",
      "src/storage/storage.controller.ts",
      "src/notification/notification.controller.ts",
      "src/notification/email-template.controller.ts",
    ],
  },
  output: "../../libs/sdk/src/api",
  primitive: true,
  keyword: true,
  propagate: false,
  simulate: false,
  assert: false,
  json: false,
  swagger: {
    output: "../../libs/sdk/swagger.json",
    security: {
      bearer: { type: "apiKey", name: "Authorization", in: "header" },
      cookie: { type: "apiKey", name: "accessToken", in: "cookie" },
    },
    servers: [{ url: "http://localhost:5000/api/v1", description: "Local development" }],
  },
};

export default config;
