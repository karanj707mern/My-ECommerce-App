import { component$ } from '@builder.io/qwik';

export const Footer = component$(() => {
  return (
    <footer class="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p class="text-center text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} Moringa Store. All rights reserved.
        </p>
      </div>
    </footer>
  );
});
