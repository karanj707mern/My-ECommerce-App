import { component$, Slot } from '@builder.io/qwik';
import { QwikCityProvider } from '@builder.io/qwik-city';
import { RouterHead } from './components/router-head';
import { ThemeScript } from './components/theme-script';
import './global.css';

export default component$(() => {
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
