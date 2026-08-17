"use client";

import { useState } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import dynamic from "next/dynamic";

const AdminSidebar = dynamic(() => import("@/components/admin/AdminSidebar"), {
  ssr: false,
  loading: () => (
    <div className="flex h-14 w-14 items-center justify-center border-r border-[var(--border-color)] bg-[var(--bg-secondary)]">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border-color)] border-t-emerald-600" />
    </div>
  ),
});
import { useTheme } from "@/components/ThemeProvider";
import { usePreviewMode } from "@/hooks/usePreviewMode";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { previewMode, enablePreview, disablePreview } = usePreviewMode();

  const handlePreview = () => {
    enablePreview("/");
  };

  const handleExitPreview = () => {
    disablePreview("/admin");
  };

  return (
    <AdminGuard>
      <div className="theme-transition flex min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <AdminSidebar
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <div className="theme-transition flex min-w-0 flex-1 flex-col transition-all duration-300">
          <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/95 px-4 backdrop-blur lg:px-10">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open navigation"
                className="rounded-xl border border-[var(--border-color)] p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] lg:hidden"
              >
                <span className="block h-0.5 w-5 bg-current" />
                <span className="mt-1 block h-0.5 w-5 bg-current" />
                <span className="mt-1 block h-0.5 w-5 bg-current" />
              </button>
              <p className="text-sm font-semibold text-[var(--text-primary)] lg:hidden">
                Moringa Admin
              </p>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggleInline />
              {previewMode ? (
                <button
                  type="button"
                  onClick={handleExitPreview}
                  className="btn-vibrant inline-flex items-center gap-2 rounded-full border-2 border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
                  aria-label="Exit preview"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  Exit Preview
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePreview}
                  className="btn-vibrant inline-flex items-center gap-2 rounded-full border-2 border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
                  aria-label="Preview store"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
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

          <main className="theme-transition min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8 pt-[env(safe-area-inset-top)]">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}

function ThemeToggleInline() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      className="btn-nav"
    >
      {theme === "light" ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
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
      Theme
    </button>
  );
}
