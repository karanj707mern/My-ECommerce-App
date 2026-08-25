import {
  $,
  component$,
  useOnWindow,
  useSignal,
  useVisibleTask$,
} from "@builder.io/qwik";

/**
 * Self-contained theme switch. Toggles the `dark` class on <html> and
 * persists the choice in localStorage (`theme` key), consistent with
 * the ThemeScript bootstrap in root.tsx.
 */
export const ThemeToggle = component$(() => {
  const theme = useSignal<"light" | "dark">("light");

  useVisibleTask$(() => {
    theme.value = document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
  });

  useOnWindow(
    "moringa:theme-changed",
    $(() => {
      theme.value = document.documentElement.classList.contains("dark")
        ? "dark"
        : "light";
    }),
  );

  const toggleTheme = $(() => {
    const next = document.documentElement.classList.contains("dark")
      ? "light"
      : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("theme", next);
    } catch {
      // localStorage can throw in private-mode browsers; theme still toggles.
    }
    window.dispatchEvent(new Event("moringa:theme-changed"));
    theme.value = next;
  });

  return (
    <button
      type="button"
      onClick$={toggleTheme}
      aria-label={`Switch to ${theme.value === "light" ? "dark" : "light"} mode`}
      title={`Switch to ${theme.value === "light" ? "dark" : "light"} mode`}
      class="btn-nav"
    >
      {theme.value === "light" ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-5 w-5"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      )}
    </button>
  );
});

export default ThemeToggle;
