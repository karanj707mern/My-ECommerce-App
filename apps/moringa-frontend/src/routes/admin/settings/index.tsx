import { component$, Slot } from '@builder.io/qwik';
import type { RequestHandler } from '@builder.io/qwik-city';

export const onGet: RequestHandler = async () => {
  throw new Error('Not implemented');
};

export default component$(() => {
  return (
    <div>
      <h1>Admin Settings</h1>
      <Slot />
    </div>
  );
});
