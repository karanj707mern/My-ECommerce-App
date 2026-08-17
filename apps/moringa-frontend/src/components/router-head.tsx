import { component$, Slot, useStyles$ } from '@builder.io/qwik';

export const RouterHead = component$(() => {
  useStyles$(`
    :global(body) {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
  `);

  return (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <Slot />
    </>
  );
});
