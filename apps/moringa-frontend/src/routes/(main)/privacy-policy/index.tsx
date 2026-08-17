import { component$, Slot } from '@builder.io/qwik';

export default component$(() => {
  return (
    <div>
      <h1>Privacy Policy</h1>
      <Slot />
    </div>
  );
});
