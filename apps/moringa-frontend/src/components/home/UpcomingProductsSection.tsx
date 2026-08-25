import { component$ } from "@builder.io/qwik";
import { SmartImage } from "../SmartImage";
import { resolveImageUrl } from "../../lib/config";

export interface UpcomingProduct {
  id: string | number;
  name: string;
  description?: string | null;
  image?: string | null;
}

/**
 * Qwik port of legacy `components/Home/UpcomingProductsSection.tsx`.
 *
 * Dark "coming soon" teaser rail for products that are not yet active.
 */
export const UpcomingProductsSection = component$<{
  upcomingProducts: UpcomingProduct[];
}>(({ upcomingProducts }) => {
  if (upcomingProducts.length === 0) {
    return null;
  }

  return (
    <section class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
      <div class="overflow-hidden rounded-[2.25rem] border border-[var(--border-color)] bg-gradient-to-br from-[var(--text-primary)]/95 to-emerald-900 p-8 text-[var(--text-primary)] shadow-lg">
        <p class="text-sm uppercase tracking-[0.16em] text-emerald-200">
          Coming soon
        </p>
        <h2 class="mt-3 font-serif text-3xl text-[var(--text-primary)]">
          Upcoming products worth the wait
        </h2>
        <p class="mt-3 max-w-2xl text-sm leading-7 text-emerald-50/90">
          We&apos;re preparing a few more moringa essentials. Join the waitlist
          and be the first to know when they&apos;re available.
        </p>

        <div class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {upcomingProducts.map((product) => (
            <article
              key={product.id}
              class="overflow-hidden rounded-[1.75rem] border border-[var(--border-color)]/20 bg-[var(--bg-secondary)]/10"
            >
              <SmartImage
                src={resolveImageUrl(product.image ?? undefined)}
                alt={product.name}
                width={400}
                height={300}
                class="h-40 w-full object-cover"
              />
              <div class="space-y-2 p-5">
                <p class="text-sm uppercase tracking-[0.12em] text-emerald-200">
                  Coming soon
                </p>
                <h3 class="text-xl font-semibold text-[var(--text-primary)]">
                  {product.name}
                </h3>
                <p class="text-sm leading-6 text-[var(--text-secondary)]">
                  {product.description ?? ""}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
});
