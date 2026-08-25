import { component$, useSignal } from "@builder.io/qwik";
import {
  Form,
  Link,
  routeAction$,
  routeLoader$,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { api } from "../../lib/api/client";
import { getProducts } from "../../lib/api/product";
import {
  ApiError,
  createServerConnection,
  invokeSdk,
} from "../../lib/api/sdk-server";
import type { Product } from "@moringa/shared";
import { resolveImageUrl } from "../../lib/config";
import { formatRupees } from "../../lib/formatters";

/**
 * ============================================================================
 * CANONICAL ROUTE BLUEPRINT — products catalog
 * ============================================================================
 * This file is the reference pattern for every data-driven route in the
 * storefront. Three concerns are deliberately separated:
 *
 *   LOADER  (server-only)   reads via @moringa/sdk + forwarded cookies
 *   ACTION  (server-only)   writes via SDK, progressive-enhancement forms
 *   COMPONENT (islands)     zero-eager-JS rendering; handlers are QRLs
 *
 * THE "RESUMABLE SHIFT" — why this looks different from React/Next.js:
 *
 *   Hydration-era frameworks ship a component tree as JS, render it AGAIN on
 *   the client after HTML paint, and replay state so the virtual DOM can take
 *   over. Every visitor pays that bootstrap cost whether they interact or not.
 *
 *   Qwik inverts it: loaders execute ONLY on the server; their results are
 *   serialized INTO the HTML (`<script type="qwik/json">`), and every event
 *   handler is compiled to a lazily-fetchable QRL chunk. The initial page is
 *   fully interactive markup with ZERO component JavaScript executing on load.
 *   When the user actually clicks "Add to cart", the browser downloads exactly
 *   that handler's chunk and resumes execution mid-function. TTI ≈ FCP, and
 *   checkout pages never pay for catalog logic (or vice versa).
 *
 *   Concretely below: `useCatalog()` costs no client JS; the cart form posts
 *   to Qwik City's action endpoint and WORKS WITHOUT JAVASCRIPT entirely
 *   (`action={addToCart}` + named inputs); `onClick$` handlers hydrate only on
 *   interaction.
 * ============================================================================
 */

/** Narrowing guard: generated Output is `Primitive<unknown>` until backend
 * DTO surfaces stabilize, so the storefront validates shape at the boundary. */
function toProduct(raw: unknown): Product | null {
  if (typeof raw !== "object" || raw === null) return null;
  const candidate = raw as Record<string, unknown>;
  if (
    typeof candidate.id !== "number" ||
    typeof candidate.name !== "string" ||
    typeof candidate.price !== "number"
  ) {
    return null;
  }
  return candidate as unknown as Product;
}

/**
 * SERVER-ONLY catalog fetch.
 *
 * Runs during SSR (and at build time for static routes). Two data planes
 * cooperate here, exactly as the monorepo contract prescribes:
 *
 *   - SDK plane (`@moringa/sdk` + forwarded cookies): controllers the Nestia
 *     generator covers — `hero` for the banner strip, `cart` for mutations.
 *   - Legacy http.ts plane (`lib/api/product.ts`): `product.controller.ts` is
 *     DELIBERATELY excluded from generation (see backend nestia.config.ts —
 *     multipart uploads / deep Prisma intersections defeat static analysis)
 *     until those endpoints are DTO-wrapped.
 *
 * The connection is created per-request: cookies from the BROWSER's request
 * are forwarded to Fastify verbatim, giving authenticated/guest pricing
 * without tokens ever entering client JS. Failures degrade to typed states
 * instead of throwing — a catalog outage must still render the shell with
 * recovery UI.
 */
export const useCatalog = routeLoader$(async (event) => {
  // Per-request connection — NEVER module-scoped on the streaming server.
  const serverConnection = createServerConnection({ event });

  const [heroResult, productsResult] = await Promise.allSettled([
    invokeSdk(() => api.functional.hero.findAll(serverConnection), {
      idempotent: true, // GET: safe to retry through transient 5xx/network blips
    }),
    getProducts(),
  ]);

  const heroValue =
    heroResult.status === "fulfilled" &&
    typeof heroResult.value === "object" &&
    heroResult.value !== null &&
    "url" in heroResult.value &&
    typeof (heroResult.value as { url?: unknown }).url === "string"
      ? (heroResult.value as { url: string }).url
      : null;

  if (productsResult.status === "rejected") {
    const reason = productsResult.reason;
    const failure = reason instanceof ApiError ? reason : null;
    return {
      status: "error" as const,
      products: [] as Product[],
      heroImage: heroValue,
      errorMessage:
        failure?.kind === "timeout"
          ? "The store is taking longer than usual to respond. Please retry."
          : (failure?.message ?? "Products could not be loaded right now."),
      errorStatus: failure?.status ?? 502,
    };
  }

  const rows: unknown[] = Array.isArray(productsResult.value)
    ? productsResult.value
    : [];

  return {
    status: "success" as const,
    products: rows
      .map(toProduct)
      .filter((product): product is Product => product !== null),
    heroImage: heroValue,
    errorMessage: null,
    errorStatus: null,
  };
});

/** Form posts deliver string-encoded fields; qwik-city hands the action a
 * plain JSONObject (no FormData API), so coercion is explicit and safe. */
function asFormString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * SERVER-ONLY mutation: POST /cart via the generated SDK.
 *
 * routeAction$ gives the storefront a framework-native write path: the form
 * below posts to Qwik City's internal endpoint, THIS function executes on the
 * server with the user's cookies attached, and the result serializes back —
 * full CRUD with zero hand-written client fetch code and zero token handling
 * in the browser plane.
 */
export const useAddToCart = routeAction$(async (form, event) => {
  const productId = Number(asFormString(form.productId));
  const quantity = Number(asFormString(form.quantity) || "1");

  if (!Number.isInteger(productId) || productId <= 0) {
    return { ok: false as const, message: "Invalid product." };
  }
  const safeQuantity =
    Number.isInteger(quantity) && quantity > 0 ? Math.min(quantity, 99) : 1;

  try {
    await invokeSdk(
      () =>
        api.functional.cart.create(createServerConnection({ event }), {
          dto: { productId, quantity: safeQuantity },
        }),
      // Deliberately NOT idempotent: retries could double-add line items.
    );
    return {
      ok: true as const,
      message: `Added ${safeQuantity > 1 ? `${safeQuantity} × ` : ""}to your cart.`,
    };
  } catch (err) {
    const failure = err instanceof ApiError ? err : null;
    if (failure?.status === 401) {
      return { ok: false as const, message: "Please sign in to start a cart." };
    }
    return {
      ok: false as const,
      message: failure?.message ?? "Could not add to cart. Please try again.",
    };
  }
});

/**
 * Catalog view. The component body itself renders during SSR; nothing here
 * executes in the browser until an $()-wrapped handler fires.
 */
export default component$(() => {
  const catalog = useCatalog();
  const action = useAddToCart();
  // Client-side UI state lives in signals; server data NEVER mirrors here.
  const pendingProductId = useSignal<number | null>(null);

  return (
    <section class="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header class="mb-8 flex flex-col gap-2">
        <p class="text-sm font-medium uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
          New arrivals
        </p>
        <h1 class="font-serif text-3xl font-semibold text-stone-900 dark:text-stone-50 sm:text-4xl">
          Fresh from the moringa groves
        </h1>
      </header>

      {catalog.value.status === "error" ? (
        <div
          role="alert"
          class="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/60 dark:bg-red-950/40"
        >
          <p class="text-stone-800 dark:text-stone-100">
            {catalog.value.errorMessage}
          </p>
          <Link
            href="/products"
            class="mt-4 inline-block rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            Retry
          </Link>
        </div>
      ) : (
        <ul class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {catalog.value.products.map((product) => (
            <li
              key={product.id}
              class="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md dark:border-stone-800 dark:bg-stone-900"
            >
              <Link
                href={`/product/${product.slug ?? product.id}`}
                class="block aspect-square overflow-hidden bg-stone-100 dark:bg-stone-800"
                aria-label={`View ${product.name}`}
              >
                <img
                  src={resolveImageUrl(product.image)}
                  alt={product.name}
                  width={512}
                  height={512}
                  loading="lazy"
                  decoding="async"
                  class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
              </Link>

              <div class="flex flex-1 flex-col gap-3 p-4">
                <div class="flex-1">
                  <h2 class="text-base font-semibold text-stone-900 dark:text-stone-50">
                    <Link
                      href={`/product/${product.slug ?? product.id}`}
                      class="hover:underline"
                    >
                      {product.name}
                    </Link>
                  </h2>
                  {(product.brand ?? product.sku) && (
                    <p class="mt-0.5 text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">
                      {product.brand ?? product.sku}
                    </p>
                  )}
                </div>

                <div class="flex items-baseline justify-between gap-2">
                  <span class="text-lg font-bold text-emerald-800 dark:text-emerald-300">
                    {formatRupees(product.price)}
                  </span>
                  {typeof product.stock === "number" && product.stock <= 0 && (
                    <span class="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-700 dark:text-stone-300">
                      Out of stock
                    </span>
                  )}
                </div>

                {/* Progressive enhancement: qwik-city's <Form> renders a real
                    <form method="post"> that works with JS disabled; with JS
                    present it intercepts submission and resumes the handler
                    as an island instead of reloading. */}
                <Form action={action} class="mt-auto">
                  <input
                    type="hidden"
                    name="productId"
                    value={String(product.id)}
                  />
                  <input type="hidden" name="quantity" value="1" />
                  <button
                    type="submit"
                    disabled={
                      (typeof product.stock === "number" &&
                        product.stock <= 0) ||
                      pendingProductId.value === product.id ||
                      action.isRunning
                    }
                    class="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pendingProductId.value === product.id || action.isRunning
                      ? "Adding…"
                      : "Add to cart"}
                  </button>
                </Form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Action results surface inline; the toast bus stays available for
          island-level flows. */}
      {action.value?.message && (
        <p
          role="status"
          class={{
            "mt-6 rounded-lg px-4 py-3 text-sm font-medium": true,
            "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200":
              action.value.ok,
            "bg-red-50 text-red-900 dark:bg-red-950/60 dark:text-red-200":
              !action.value.ok,
          }}
        >
          {action.value.message}
        </p>
      )}
    </section>
  );
});

export const head: DocumentHead = {
  title: "New Arrivals | Moringa Store Online",
  meta: [
    {
      name: "description",
      content:
        "Shop the freshest moringa powders, teas and wellness blends — new arrivals restocked weekly.",
    },
    { property: "og:type", content: "website" },
    { property: "og:title", content: "New Arrivals | Moringa Store Online" },
  ],
};
