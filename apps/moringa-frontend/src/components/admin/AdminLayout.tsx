import { component$, Slot, useSignal } from "@builder.io/qwik";
import AdminGuard from "./AdminGuard";
import AdminSidebar from "./AdminSidebar";
import ThemeToggle from "../ThemeToggle";
import { usePreviewMode } from "../../hooks/usePreviewMode";

/**
 * Admin panel chrome: guard + sidebar + sticky header with preview toggle.
 * Port of legacy `app/admin/layout.tsx`.
 */
export const AdminLayout = component$(() => {
  const drawerOpen = useSignal(false);
  const sidebarCollapsed = useSignal(false);
  const { previewMode, enablePreview, disablePreview } = usePreviewMode();

  return (
    <AdminGuard>
      <div class="theme-transition flex min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <AdminSidebar
          open={drawerOpen.value}
          collapsed={sidebarCollapsed.value}
          onOpen$={() => {
            drawerOpen.value = true;
          }}
          onClose$={() => {
            drawerOpen.value = false;
          }}
          onToggleCollapse$={() => {
            sidebarCollapsed.value = !sidebarCollapsed.value;
          }}
        />

        <div class="theme-transition flex min-w-0 flex-1 flex-col transition-all duration-300">
          <header class="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/95 px-4 backdrop-blur lg:px-10">
            <div class="flex items-center gap-3">
              <button
                type="button"
                onClick$={() => {
                  drawerOpen.value = true;
                }}
                aria-label="Open navigation"
                class="rounded-xl border border-[var(--border-color)] p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] lg:hidden"
              >
                <span class="block h-0.5 w-5 bg-current" />
                <span class="mt-1 block h-0.5 w-5 bg-current" />
                <span class="mt-1 block h-0.5 w-5 bg-current" />
              </button>
              <p class="text-sm font-semibold text-[var(--text-primary)] lg:hidden">
                Moringa Admin
              </p>
            </div>

            <div class="flex items-center gap-2">
              <ThemeToggle />
              {previewMode.value ? (
                <button
                  type="button"
                  onClick$={() => disablePreview("/admin")}
                  class="btn-vibrant inline-flex items-center gap-2 rounded-full border-2 border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
                  aria-label="Exit preview"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width={2.2}
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  Exit Preview
                </button>
              ) : (
                <button
                  type="button"
                  onClick$={() => enablePreview("/")}
                  class="btn-vibrant inline-flex items-center gap-2 rounded-full border-2 border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
                  aria-label="Preview store"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width={2.2}
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Preview Website
                </button>
              )}
            </div>
          </header>

          <main class="theme-transition min-w-0 flex-1 px-4 py-6 pt-[env(safe-area-inset-top)] sm:px-6 lg:px-10 lg:py-8">
            <div class="mx-auto max-w-6xl">
              <Slot />
            </div>
          </main>
        </div>
      </div>
    </AdminGuard>
  );
});

export default AdminLayout;
