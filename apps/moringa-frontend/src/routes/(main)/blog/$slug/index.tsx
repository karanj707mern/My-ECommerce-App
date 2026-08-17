import { component$, Slot } from '@builder.io/qwik';

export default component$(() => {
  return (
    <div>
      <h1>Blog Post</h1>
      <Slot />
    </div>
  );
});
