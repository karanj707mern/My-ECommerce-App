import { component$, Slot, useSignal } from '@builder.io/qwik';
import { QwikCityProvider } from '@builder.io/qwik-city';
import { RouterHead } from './components/router-head';
import { ThemeScript } from './components/theme-script';
import './global.css';

export default component$(() => {
  const isDevelopment = useSignal(true);

  if (isDevelopment.value) {
    return (
      <QwikCityProvider>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>We Are In Development | Moringa Store</title>
          <meta
            name="description"
            content="Our website is currently being updated with fresh new features and products. We'll be back very soon with an enhanced shopping experience."
          />
          <link rel="manifest" href="/manifest.webmanifest" />
          <RouterHead />
          <ThemeScript />
        </head>
        <body>
          <div class="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-900 px-4">
            <div class="max-w-2xl w-full text-center">
              <div class="mb-8 inline-flex items-center justify-center rounded-full bg-emerald-900/10 p-6 dark:bg-emerald-400/10">
                <svg
                  class="h-16 w-16 text-emerald-700 dark:text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="1.5"
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
        </body>
      </QwikCityProvider>
    );
  }

  return (
    <QwikCityProvider>
      <head>
        <meta charset="utf-8" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <RouterHead />
        <ThemeScript />
      </head>
      <body>
        <Slot />
      </body>
    </QwikCityProvider>
  );
});
