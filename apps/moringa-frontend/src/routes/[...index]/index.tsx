import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";

const HELPFUL_LINKS = [
  {
    label: "Shop all products",
    href: "/shop",
    description: "Browse moringa powders, teas, and oils",
    icon: "🌿",
  },
  {
    label: "Wellness journal",
    href: "/blog",
    description: "Read articles about natural health",
    icon: "📖",
  },
  {
    label: "About Moringa",
    href: "/about-us",
    description: "Learn about our sourcing and quality",
    icon: "🌱",
  },
  {
    label: "Contact support",
    href: "/contact",
    description: "Get help with orders and questions",
    icon: "💬",
  },
  {
    label: "Shipping & returns",
    href: "/shipping",
    description: "Delivery info and return policy",
    icon: "📦",
  },
  {
    label: "Track your order",
    href: "/orders",
    description: "Check active order status",
    icon: "🚚",
  },
];

const PARTICLE_EMOJI = ["🌿", "🍃", "🌱", "✨", "💚", "🌿"];

/**
 * Qwik port of legacy `app/not-found.tsx`.
 *
 * Themed 404 experience with animated leaf silhouettes, floating particles,
 * gradient headline and a grid of helpful destinations.
 */
export default component$(() => {
  const isLoaded = useSignal(false);
  const isDark = useSignal(false);

  useVisibleTask$(() => {
    isDark.value = document.documentElement.classList.contains("dark");
    isLoaded.value = true;
  });

  const toggleTheme = $(() => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* private-mode browsers; theme still toggles */
    }
    isDark.value = next;
  });

  return (
    <div
      class={`relative min-h-[100dvh] overflow-hidden ${
        isDark.value
          ? "bg-gradient-to-br from-emerald-950 via-teal-950 to-green-950"
          : "bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50"
      } text-[var(--text-primary)]`}
    >
      <button
        onClick$={toggleTheme}
        class="absolute right-4 top-4 z-10 rounded-full p-2 hover:bg-white/30 focus:outline-none dark:bg-black/20 dark:hover:bg-black/30"
        aria-label="Toggle theme"
      >
        <svg
          class="h-6 w-6"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          {isDark.value ? (
            <path d="M21 12.79A9 9 0 1012 2.21l-6.19 6.19A9 9 0 0021 12.79z" />
          ) : (
            <path d="M12 4.5V2m0 20v-2.5M5.618 5.618A12 12 0 0112 4.5a12 12 0 115.656 5.657" />
          )}
        </svg>
      </button>

      {/* Animated background elements */}
      <div class="absolute inset-0 overflow-hidden">
        <svg
          class="absolute -left-10 -top-10 h-96 w-96 text-emerald-600 opacity-10 dark:text-emerald-400 dark:opacity-20"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M100 20C60 60 20 80 20 120C20 160 60 180 100 180C140 180 180 160 180 120C180 80 140 60 100 20Z"
            stroke="currentColor"
            stroke-width="2"
          />
          <path
            d="M100 40C70 70 40 90 40 120C40 150 70 170 100 170C130 170 160 150 160 120C160 90 130 70 100 40Z"
            stroke="currentColor"
            stroke-width="1.5"
          />
          <line
            x1="100"
            y1="20"
            x2="100"
            y2="180"
            stroke="currentColor"
            stroke-width="1"
          />
        </svg>
        <svg
          class="absolute -right-10 top-1/3 h-80 w-80 text-teal-600 opacity-10 dark:text-teal-400 dark:opacity-20"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M100 20C60 60 20 80 20 120C20 160 60 180 100 180C140 180 180 160 180 120C180 80 140 60 100 20Z"
            stroke="currentColor"
            stroke-width="2"
          />
          <path
            d="M100 40C70 70 40 90 40 120C40 150 70 170 100 170C130 170 160 150 160 120C160 90 130 70 100 40Z"
            stroke="currentColor"
            stroke-width="1.5"
          />
          <line
            x1="100"
            y1="20"
            x2="100"
            y2="180"
            stroke="currentColor"
            stroke-width="1"
          />
        </svg>
        <svg
          class="absolute -bottom-10 left-1/3 h-72 w-72 text-lime-600 opacity-10 dark:text-lime-400 dark:opacity-20"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M100 20C60 60 20 80 20 120C20 160 60 180 100 180C140 180 180 160 180 120C180 80 140 60 100 20Z"
            stroke="currentColor"
            stroke-width="2"
          />
          <path
            d="M100 40C70 70 40 90 40 120C40 150 70 170 100 170C130 170 160 150 160 120C160 90 130 70 100 40Z"
            stroke="currentColor"
            stroke-width="1.5"
          />
          <line
            x1="100"
            y1="20"
            x2="100"
            y2="180"
            stroke="currentColor"
            stroke-width="1"
          />
        </svg>

        {/* Floating symbolic particles */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            class="absolute text-4xl opacity-10"
            style={{
              left: `${20 + i * 15}%`,
              top: `${10 + i * 15}%`,
              animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          >
            {PARTICLE_EMOJI[i]}
          </div>
        ))}
      </div>

      <div class="relative mx-auto flex min-h-[100dvh] max-w-6xl flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-10">
        <div
          class={`w-full max-w-4xl transition-all duration-1000 ${
            isLoaded.value
              ? "translate-y-0 opacity-100"
              : "translate-y-8 opacity-0"
          }`}
        >
          {/* Main 404 content */}
          <div class="card rounded-[3rem] border border-white/40 bg-[var(--bg-secondary)]/80 p-8 shadow-2xl backdrop-blur-xl sm:p-14">
            <div class="mx-auto max-w-2xl text-center">
              <div class="relative mb-8">
                <div class="bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 bg-clip-text text-8xl font-bold text-transparent sm:text-9xl">
                  404
                </div>
                <div class="absolute -right-4 -top-4 animate-bounce text-6xl">
                  🌿
                </div>
              </div>

              <h1 class="bg-gradient-to-r from-emerald-700 via-teal-600 to-green-600 bg-clip-text font-serif text-4xl text-transparent dark:from-emerald-300 dark:via-teal-400 dark:to-green-300 sm:text-5xl lg:text-6xl">
                Oops! Page not found
              </h1>

              <p class="mt-6 bg-gradient-to-r from-emerald-700 via-teal-600 to-green-600 bg-clip-text text-lg leading-8 text-transparent dark:from-emerald-300 dark:via-teal-400 dark:to-green-300 sm:text-xl">
                Looks like this page has wandered off into the wilderness.
                Don&apos;t worry — our moringa products are still here waiting
                for you! 🌱
              </p>

              {/* CTA buttons */}
              <div class="mt-10 flex flex-wrap justify-center gap-4">
                <Link
                  href="/"
                  class="group relative overflow-hidden rounded-full bg-gradient-to-r from-emerald-700 to-teal-700 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
                >
                  <span class="relative z-10">Back to home</span>
                  <div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-teal-700 to-emerald-700 transition-transform duration-300 group-hover:translate-x-0" />
                </Link>
                <Link
                  href="/shop"
                  class="rounded-full border-2 border-[var(--border-color)] bg-[var(--bg-secondary)] px-8 py-4 text-base font-semibold text-[var(--text-primary)] transition-all duration-300 hover:scale-105 hover:border-emerald-300 hover:bg-emerald-50"
                >
                  Browse shop
                </Link>
              </div>
            </div>

            {/* Helpful links section */}
            <div class="mt-16">
              <p class="bg-gradient-to-r from-emerald-600 via-teal-500 to-green-600 bg-clip-text text-center text-xs uppercase tracking-[0.2em] text-transparent dark:from-emerald-300 dark:via-teal-400 dark:to-green-300">
                Popular destinations
              </p>
              <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {HELPFUL_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    class="group relative overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg"
                  >
                    <div class="flex items-start gap-4">
                      <span class="text-3xl">{link.icon}</span>
                      <div class="flex-1">
                        <p class="bg-gradient-to-r from-emerald-700 via-teal-600 to-green-600 bg-clip-text text-sm font-semibold text-transparent transition-colors group-hover:text-emerald-700 dark:from-emerald-300 dark:via-teal-400 dark:to-green-300">
                          {link.label}
                        </p>
                        <p class="mt-1 text-xs leading-6 text-[var(--text-secondary)]">
                          {link.description}
                        </p>
                      </div>
                      <svg
                        class="h-5 w-5 text-[var(--text-muted)] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-emerald-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Footer text */}
          <div class="mt-12 text-center">
            <p class="text-sm text-[var(--text-secondary)]">
              Need help? Contact us at{" "}
              <a
                href="mailto:moringastoreonline@gmail.com"
                class="font-semibold text-emerald-700 underline underline-offset-4 transition hover:text-emerald-800"
              >
                moringastoreonline@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Page not found | Moringa Store Online",
};
