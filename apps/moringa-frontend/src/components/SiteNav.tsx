import { component$ } from '@builder.io/qwik';

export const SiteNav = component$(() => {
  return (
    <nav class="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center justify-between">
          <a href="/" class="text-xl font-bold text-emerald-700">
            Moringa Store
          </a>
          <div class="hidden md:flex gap-6">
            <a href="/shop" class="text-gray-700 hover:text-emerald-700 dark:text-gray-300">
              Shop
            </a>
            <a href="/about-us" class="text-gray-700 hover:text-emerald-700 dark:text-gray-300">
              About
            </a>
            <a href="/blog" class="text-gray-700 hover:text-emerald-700 dark:text-gray-300">
              Blog
            </a>
            <a href="/cart" class="text-gray-700 hover:text-emerald-700 dark:text-gray-300">
              Cart
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
});
