import { component$, Slot } from '@builder.io/qwik';

export default component$(() => {
  return (
    <div>
      <h1>Blog</h1>
      <Slot />
    </div>
  );
});
