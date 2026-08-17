import { component$ } from '@builder.io/qwik';
import { AppButton } from '@moringa/ui';

export default component$(() => {
  return (
    <div class="min-h-screen">
      <h1 class="text-4xl font-bold text-center py-20">
        Moringa Store Online
      </h1>
      <div class="flex justify-center gap-4">
        <AppButton href="/shop">Shop Now</AppButton>
        <AppButton variant="secondary" href="/about-us">
          Learn More
        </AppButton>
      </div>
    </div>
  );
});
