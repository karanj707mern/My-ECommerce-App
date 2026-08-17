"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useEffect, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { usePreviewMode } from "@/hooks/usePreviewMode";

const NAV_ITEMS = [
  { href: "/shop", label: "Shop" },
  { href: "/orders", label: "Orders" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/blog", label: "Blog" },
  { href: "/gift-cards", label: "Gift Cards" },
];

type NavLinksProps = {
  isAdmin?: boolean;
  previewMode: boolean;
  pathname: string;
  isLoggedIn: boolean;
  onLogout?: () => void;
  theme: string;
  toggleTheme: () => void;
  disablePreview: (path: string) => void;
  cartCount: number;
  wishlistCount: number;
  isActive: Record<string, boolean>;
};

const NavLinks = ({
  isAdmin,
  previewMode,
  pathname,
  isLoggedIn,
  onLogout,
  theme,
  toggleTheme,
  disablePreview,
  cartCount,
  wishlistCount,
  isActive,
}: NavLinksProps) => {
  if (isAdmin && !previewMode) {
    return (
      <>
        <Link
          href="/admin"
          aria-current={pathname.startsWith("/admin") ? "page" : undefined}
          className="btn-nav"
        >
          Admin panel
        </Link>

        {isLoggedIn ? (
          <button type="button" onClick={onLogout} className="btn-nav">
            Logout
          </button>
        ) : (
          <Link href="/auth" className="btn-nav-wide">
            Admin login
          </Link>
        )}

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
      </>
    );
  }

  return (
    <>
      <Link
        href="/shop"
        aria-current={
          pathname === "/shop" || pathname.startsWith("/product")
            ? "page"
            : undefined
        }
        className="btn-nav whitespace-nowrap"
      >
        Shop
      </Link>

      <Link
        href="/cart"
        aria-current={pathname === "/cart" ? "page" : undefined}
        className="btn-nav whitespace-nowrap"
      >
        <span className="btn-nav-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
        </span>
        <span className="sr-only">Cart</span>
        <span
          className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold leading-none ${
            cartCount > 0
              ? "bg-white text-emerald-950 shadow-sm"
              : "bg-emerald-950/60 text-emerald-50"
          }`}
        >
          {cartCount}
        </span>
      </Link>

      {NAV_ITEMS.map((item) => {
        const active = isActive[item.href];
        if (item.href === "/shop") return null;
        if (item.href === "/wishlist") {
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="btn-nav whitespace-nowrap"
            >
              <span className="btn-nav-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </span>
              <span className="sr-only">Wishlist</span>
              <span
                className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold leading-none ${
                  wishlistCount > 0
                    ? "bg-white text-emerald-950 shadow-sm"
                    : "bg-emerald-950/60 text-emerald-50"
                }`}
              >
                {wishlistCount}
              </span>
            </Link>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="btn-nav whitespace-nowrap"
          >
            {item.label}
          </Link>
        );
      })}

      {isAdmin ? (
        <Link
          href="/admin"
          aria-current={pathname.startsWith("/admin") ? "page" : undefined}
          className="btn-nav whitespace-nowrap"
        >
          Admin panel
        </Link>
      ) : null}

      {isLoggedIn ? (
        <Link
          href="/profile"
          aria-current={pathname === "/profile" ? "page" : undefined}
          className="btn-nav whitespace-nowrap"
        >
          <span className="btn-nav-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
          <span className="hidden sm:inline">Profile</span>
        </Link>
      ) : null}

      {isLoggedIn ? (
        <button
          type="button"
          onClick={onLogout}
          className="btn-nav whitespace-nowrap"
        >
          Logout
        </button>
      ) : (
        <Link
          href="/auth"
          aria-current={pathname === "/auth" ? "page" : undefined}
          className="btn-nav-wide whitespace-nowrap"
        >
          Login
        </Link>
      )}

      {previewMode ? (
        <button
          type="button"
          onClick={() => disablePreview("/admin")}
          className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:text-red-300"
        >
          Exit Preview
        </button>
      ) : null}

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        className="btn-nav whitespace-nowrap"
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
    </>
  );
};

type SiteNavProps = {
  cartCount: number;
  wishlistCount: number;
  isLoggedIn: boolean;
  isAdmin?: boolean;
  onLogout?: () => void;
};

export default function SiteNav({
  cartCount,
  wishlistCount,
  isLoggedIn,
  isAdmin,
  onLogout,
}: SiteNavProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const { previewMode, disablePreview } = usePreviewMode();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isActive = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const item of NAV_ITEMS) {
      if (item.href === "/shop") {
        map[item.href] =
          pathname === "/shop" || pathname.startsWith("/product");
      } else {
        map[item.href] =
          pathname === item.href || pathname.startsWith(item.href + "/");
      }
    }
    return map;
  }, [pathname]);

  return (
    <nav
      aria-label="Main"
      className="sticky top-0 z-30 border-y border-[var(--border-strong)] bg-[var(--bg-secondary)] pt-[env(safe-area-inset-top)]"
      style={{ isolation: "isolate" }}
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-6 py-3 sm:px-8 md:flex-row md:items-center md:justify-between md:gap-6 lg:px-10">
        <div className="min-w-0 flex-shrink">
          <Link
            href="/"
            aria-label="Moringa Store Online homepage"
            className="group block font-serif text-[1.35rem] text-[var(--text-primary)] transition-all duration-300 hover:scale-[1.03] hover:text-emerald-700 md:text-[1.9rem] dark:hover:text-emerald-300"
          >
            <span className="relative inline-flex items-center gap-2">
              <span className="relative whitespace-nowrap">
                Moringa Store Online
                <span className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-emerald-600 transition-transform duration-300 group-hover:scale-x-100 dark:bg-emerald-400" />
              </span>
              <span className="self-center opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
                <svg
                  viewBox="0 0 220 64"
                  fill="none"
                  className="h-6 w-auto text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                >
                  <path
                    d="M4 52 L4 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <ellipse
                    cx="12"
                    cy="14"
                    rx="4"
                    ry="7.5"
                    fill="currentColor"
                    transform="rotate(-15 12 14)"
                  />
                  <ellipse
                    cx="12"
                    cy="38"
                    rx="4"
                    ry="7.5"
                    fill="currentColor"
                    transform="rotate(15 12 38)"
                  />
                  <ellipse cx="4" cy="26" rx="4" ry="7.5" fill="currentColor" />
                  <ellipse
                    cx="22"
                    cy="10"
                    rx="3.6"
                    ry="6.8"
                    fill="currentColor"
                    transform="rotate(-10 22 10)"
                  />
                  <ellipse
                    cx="22"
                    cy="42"
                    rx="3.6"
                    ry="6.8"
                    fill="currentColor"
                    transform="rotate(10 22 42)"
                  />
                  <ellipse
                    cx="34"
                    cy="8"
                    rx="3.2"
                    ry="6"
                    fill="currentColor"
                    transform="rotate(-8 34 8)"
                  />
                  <ellipse
                    cx="34"
                    cy="44"
                    rx="3.2"
                    ry="6"
                    fill="currentColor"
                    transform="rotate(8 34 44)"
                  />
                  <ellipse
                    cx="46"
                    cy="7"
                    rx="2.8"
                    ry="5.2"
                    fill="currentColor"
                    transform="rotate(-6 46 7)"
                  />
                  <ellipse
                    cx="46"
                    cy="45"
                    rx="2.8"
                    ry="5.2"
                    fill="currentColor"
                    transform="rotate(6 46 45)"
                  />
                  <ellipse
                    cx="58"
                    cy="8"
                    rx="2.4"
                    ry="4.4"
                    fill="currentColor"
                    transform="rotate(-5 58 8)"
                  />
                  <ellipse
                    cx="58"
                    cy="44"
                    rx="2.4"
                    ry="4.4"
                    fill="currentColor"
                    transform="rotate(5 58 44)"
                  />
                  <ellipse
                    cx="70"
                    cy="10"
                    rx="2"
                    ry="3.6"
                    fill="currentColor"
                    transform="rotate(-4 70 10)"
                  />
                  <ellipse
                    cx="70"
                    cy="42"
                    rx="2"
                    ry="3.6"
                    fill="currentColor"
                    transform="rotate(4 70 42)"
                  />
                </svg>
              </span>
            </span>
          </Link>
          <p className="text-sm uppercase tracking-[0.1em] text-[var(--text-secondary)] transition-all duration-300 group-hover:text-emerald-700 md:tracking-[0.16em] dark:hover:text-emerald-300">
            Your Natural Health Partner
          </p>
        </div>

        <div className="flex w-full items-center justify-between md:w-auto md:justify-end md:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="rounded-xl border border-[var(--border-color)] p-2 text-[var(--text-secondary)] transition hover:bg-[var(--bg-muted)]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
              aria-hidden="true"
            >
              {menuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>

        <div className="hidden md:flex flex-shrink flex-nowrap items-center justify-end gap-2">
          <NavLinks
            isAdmin={isAdmin}
            previewMode={previewMode}
            pathname={pathname}
            isLoggedIn={isLoggedIn}
            onLogout={onLogout}
            theme={theme}
            toggleTheme={toggleTheme}
            disablePreview={disablePreview}
            cartCount={cartCount}
            wishlistCount={wishlistCount}
            isActive={isActive}
          />
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 pb-4 pt-2">
          <div className="flex flex-col gap-3">
            <NavLinks
              isAdmin={isAdmin}
              previewMode={previewMode}
              pathname={pathname}
              isLoggedIn={isLoggedIn}
              onLogout={onLogout}
              theme={theme}
              toggleTheme={toggleTheme}
              disablePreview={disablePreview}
              cartCount={cartCount}
              wishlistCount={wishlistCount}
              isActive={isActive}
            />
          </div>
        </div>
      )}
    </nav>
  );
}
