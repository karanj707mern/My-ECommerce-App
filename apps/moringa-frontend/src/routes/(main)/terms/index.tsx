import { component$, Slot } from '@builder.io/qwik';

export default component$(() => {
  return (
    <div>
      <h1>Terms & Conditions</h1>
      <Slot />
    </div>
  );
});
