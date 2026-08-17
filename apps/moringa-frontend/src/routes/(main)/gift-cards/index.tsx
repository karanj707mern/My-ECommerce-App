import { component$, Slot } from '@builder.io/qwik';

export default component$(() => {
  return (
    <div>
      <h1>Gift Cards</h1>
      <Slot />
    </div>
  );
});
