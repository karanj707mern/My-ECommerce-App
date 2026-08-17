import { component$, Slot } from '@builder.io/qwik';

export default component$(() => {
  return (
    <div>
      <h1>Wellness Journal</h1>
      <Slot />
    </div>
  );
});
