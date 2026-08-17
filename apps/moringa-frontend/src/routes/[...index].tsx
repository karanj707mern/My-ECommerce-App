import { component$ } from '@builder.io/qwik';
import { type DocumentHead, Link } from '@builder.io/qwik-city';

export default component$(() => {
  return (
    <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <h1 class="text-4xl font-bold text-gray-900 mb-4">404</h1>
      <p class="text-gray-600 mb-8">Page not found</p>
      <Link href="/" class="btn btn-primary">
        Go back home
      </Link>
    </div>
  );
});

export const head: DocumentHead = {
  title: '404 - Page Not Found',
};
