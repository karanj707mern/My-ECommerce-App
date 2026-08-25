import { component$ } from "@builder.io/qwik";
import { QwikCityProvider, RouterOutlet } from "@builder.io/qwik-city";
import { RouterHead } from "./components/router-head";
import { ThemeScript } from "./components/theme-script";
import { SessionHydrator } from "./components/SessionHydrator";
import { Toaster } from "./components/Toaster";
import { GoToTop } from "./components/GoToTop";
import "./global.css";

export default component$(() => {
  return (
    <QwikCityProvider>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#166534" />
        <meta
          name="google-site-verification"
          content="tIaavh_6SAQWHlDqfLaqahePUlU-k9dyhwK5-CoeCB8"
        />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link
          rel="preconnect"
          href="https://my-nest-project-pearl.vercel.app"
        />
        <RouterHead />
        <ThemeScript />
      </head>
      <body lang="en">
        {/* Accessibility: skip navigation (ported from legacy root layout) */}
        <a
          href="#main-content"
          class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-emerald-700 focus:px-4 focus:py-2 focus:text-sm focus:text-white focus:shadow-lg"
        >
          Skip to main content
        </a>
        <SessionHydrator />
        <div id="main-content">
          <RouterOutlet />
        </div>
        <Toaster />
        <GoToTop />
      </body>
    </QwikCityProvider>
  );
});
