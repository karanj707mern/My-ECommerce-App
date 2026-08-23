import { component$, Slot } from "@builder.io/qwik";
import { QwikCityProvider, RouterOutlet } from "@builder.io/qwik-city";
import { RouterHead } from "./components/router-head";
import { ThemeScript } from "./components/theme-script";
import { SessionHydrator } from "./components/SessionHydrator";
import { Toaster } from "./components/Toaster";
import "./global.css";

export default component$(() => {
  return (
    <QwikCityProvider>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <RouterHead />
        <ThemeScript />
      </head>
      <body lang="en">
        <SessionHydrator />
        <RouterOutlet />
        <Toaster />
      </body>
    </QwikCityProvider>
  );
});
