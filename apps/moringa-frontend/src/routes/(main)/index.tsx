import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { buildHead } from "../../lib/seo";

/**
 * Legacy home page is a launch placeholder ("Coming Soon").
 * `HomeClient.tsx` in the source repo was dead code (never mounted),
 * so parity means preserving this exact experience.
 */
export default component$(() => {
  return (
    <div class="flex min-h-[80vh] items-center justify-center px-4">
      <div class="w-full max-w-2xl text-center">
        <div class="mb-8 inline-flex items-center justify-center rounded-full bg-emerald-900/10 p-6 dark:bg-emerald-400/10">
          <svg
            class="h-16 w-16 text-emerald-700 dark:text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width={1.5}
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 class="mb-4 text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl dark:text-stone-100">
          We're Under Development
        </h1>

        <p class="mb-6 text-lg text-stone-600 dark:text-stone-400">
          Our website is currently being updated with fresh new features and
          products. We'll be back very soon with an enhanced shopping
          experience.
        </p>

        <p class="text-base text-stone-500 dark:text-stone-500">
          Thank you for your patience. We'll be back very soon.
        </p>
      </div>
    </div>
  );
});

export const head: DocumentHead = () =>
  buildHead({
    title: "Coming Soon - Moringa Store Online",
    description:
      "Moringa Store Online is coming soon. We're working hard to bring you premium moringa products. Stay tuned!",
    path: "/",
  });
