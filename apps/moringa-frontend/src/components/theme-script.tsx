import { component$, useSignal } from '@builder.io/qwik';

export const ThemeScript = component$(() => {
  const theme = useSignal<'light' | 'dark'>('light');

  return (
    <script
      dangerouslySetInnerHTML={`
        (function() {
          try {
            var stored = localStorage.getItem('theme');
            if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          } catch (e) {}
        })();
      `}
    />
  );
});
