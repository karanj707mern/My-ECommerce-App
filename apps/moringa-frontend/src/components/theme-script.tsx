import { component$ } from "@builder.io/qwik";

/**
 * Inline theme bootstrap script. Runs before first paint to apply the
 * persisted (or system-preferred) theme, preventing a flash of the wrong
 * color scheme. The `dark` class on <html> drives all CSS variables.
 */
export const ThemeScript = component$(() => {
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
