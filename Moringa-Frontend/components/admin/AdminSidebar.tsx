"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: string;
  description?: string;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    href: "/admin",
    label: "Overview",
    icon: "▦",
    description: "Dashboard summary",
  },
  {
    href: "/admin/orders",
    label: "Orders",
    icon: "🧾",
    description: "Shipment queue",
  },
  {
    href: "/admin/products",
    label: "Products",
    icon: "⛀",
    description: "Catalog & inventory",
  },
  {
    href: "/admin/new-arrivals",
    label: "New Arrivals & Hero",
    icon: "✨",
    description: "New arrivals & hero carousel",
  },
  {
    href: "/admin/support",
    label: "Support",
    icon: "❝",
    description: "Returns & disputes",
  },
  {
    href: "/admin/blog",
    label: "Blog",
    icon: "✎",
    description: "Wellness journal",
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: "⚙",
    description: "Store configuration",
  },
  {
    href: "/admin/gift-cards",
    label: "Gift Cards",
    icon: "🎟",
    description: "Issue and manage gift cards",
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSidebar({
  open,
  onClose,
  collapsed,
  onToggleCollapse,
}: {
  open: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();

  const navItems = ADMIN_NAV_ITEMS.map((item) => {
    const active = isActive(pathname, item.href);
    if (collapsed) {
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onClose}
          aria-current={active ? "page" : undefined}
          aria-label={item.label}
          title={item.label}
          className={`admin-nav-item flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-full text-xs transition-all duration-200 select-none ${
            active
              ? "bg-emerald-400/20 text-emerald-400 shadow-sm"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          <span aria-hidden="true" className="text-lg">
            {item.icon}
          </span>
          <span className="truncate leading-none">{item.label}</span>
        </Link>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        aria-current={active ? "page" : undefined}
        className={`group admin-nav-item flex items-center gap-3 rounded-full px-4 py-3 text-sm font-medium transition-all duration-200 select-none ${
          active
            ? "border-2"
            : "text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] hover:-translate-y-0.5 hover:shadow-md"
        }`}
      >
        <span
          aria-hidden="true"
          className={`admin-nav-item-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ${
            active
              ? "bg-emerald-400/20 text-emerald-400"
              : "bg-[var(--bg-muted)] text-emerald-700"
          }`}
        >
          {item.icon}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate">{item.label}</span>
          {item.description ? (
            <span
              className={`truncate text-xs font-normal ${
                active
                  ? "text-emerald-900 dark:text-emerald-100"
                  : "text-[var(--text-muted)]"
              }`}
            >
              {item.description}
            </span>
          ) : null}
        </span>
      </Link>
    );
  });

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        onMouseDown={() => window.getSelection()?.removeAllRanges()}
        className={`hidden lg:flex lg:flex-col shrink-0 border-r border-[var(--border-color)] bg-[var(--bg-secondary)] transition-all duration-300 ${
          collapsed ? "w-16 items-center py-4" : "w-72 px-4 py-6"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center gap-3 w-full ${
            collapsed ? "justify-center flex-col" : "px-2 pb-6"
          }`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-lg text-white">
            ❀
          </span>
          {!collapsed && (
            <div className="leading-tight min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Moringa Admin
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Management console
              </p>
            </div>
          )}
          {onToggleCollapse && !collapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="shrink-0 rounded-xl p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              ←
            </button>
          )}
          {onToggleCollapse && collapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="mt-2 rounded-xl p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              →
            </button>
          )}
        </div>

        {/* Nav items */}
        <div className="flex flex-1 flex-col gap-2 w-full">{navItems}</div>
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
            aria-hidden="true"
          />
          <div
            onMouseDown={() => window.getSelection()?.removeAllRanges()}
            className="absolute left-0 top-0 flex h-full w-72 max-w-[80%] flex-col bg-[var(--bg-secondary)] px-4 py-6 shadow-xl"
          >
            <div className="flex items-center justify-between px-2 pb-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-700 text-lg text-white">
                  ❀
                </span>
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    Moringa Admin
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Management console
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close navigation"
                title="Close navigation"
                className="rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-muted)]"
              >
                ✕
              </button>
            </div>
            <nav aria-label="Admin" className="flex flex-col gap-2">
              {ADMIN_NAV_ITEMS.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    className={`group admin-nav-item flex items-center gap-3 rounded-full px-4 py-3 text-sm font-medium transition-all duration-200 select-none ${
                      active
                        ? "border-2"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] hover:-translate-y-0.5 hover:shadow-md"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`admin-nav-item-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ${
                        active
                          ? "bg-emerald-400/20 text-emerald-400"
                          : "bg-[var(--bg-muted)] text-emerald-700"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{item.label}</span>
                      {item.description ? (
                        <span
                          className={`truncate text-xs font-normal ${
                            active
                              ? "text-emerald-900 dark:text-emerald-100"
                              : "text-[var(--text-muted)]"
                          }`}
                        >
                          {item.description}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
