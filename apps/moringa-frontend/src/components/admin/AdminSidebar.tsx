import { component$, type PropFunction } from "@builder.io/qwik";
import { Link, useLocation } from "@builder.io/qwik-city";

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

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface NavItemLinkProps {
  item: AdminNavItem;
  active: boolean;
  onClick$: PropFunction<() => void>;
}

const NavItemLink = component$<NavItemLinkProps>(
  ({ item, active, onClick$ }) => (
    <Link
      href={item.href}
      onClick$={onClick$}
      aria-current={active ? "page" : undefined}
      class={`group admin-nav-item flex items-center gap-3 rounded-full px-4 py-3 text-sm font-medium transition-all duration-200 select-none ${
        active
          ? "border-2"
          : "text-[var(--text-secondary)] hover:-translate-y-0.5 hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] hover:shadow-md"
      }`}
    >
      <span
        aria-hidden="true"
        class={`admin-nav-item-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ${
          active
            ? "bg-emerald-400/20 text-emerald-400"
            : "bg-[var(--bg-muted)] text-emerald-700"
        }`}
      >
        {item.icon}
      </span>
      <span class="flex min-w-0 flex-col">
        <span class="truncate">{item.label}</span>
        {item.description ? (
          <span
            class={`truncate text-xs font-normal ${
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
  ),
);

interface AdminSidebarProps {
  open: boolean;
  collapsed?: boolean;
  onClose$: PropFunction<() => void>;
  onToggleCollapse$: PropFunction<() => void>;
}

/**
 * Collapsible desktop sidebar + mobile drawer navigation for the admin panel.
 * Port of legacy `components/admin/AdminSidebar.tsx`.
 */
export const AdminSidebar = component$<AdminSidebarProps>(
  ({ open, collapsed, onClose$, onToggleCollapse$ }) => {
    const loc = useLocation();
    const pathname = loc.url.pathname;

    return (
      <>
        {/* Mobile top bar trigger is rendered by the layout header. */}
        {open ? (
          <button
            type="button"
            aria-label="Close navigation overlay"
            class="fixed inset-0 z-50 bg-black/40 lg:hidden"
            onClick$={onClose$}
          />
        ) : null}

        {/* Desktop sidebar */}
        <aside
          class={`hidden shrink-0 border-r border-[var(--border-color)] bg-[var(--bg-secondary)] transition-all duration-300 lg:flex lg:flex-col ${
            collapsed ? "w-16 items-center py-4" : "w-72 px-4 py-6"
          }`}
        >
          <div
            class={`flex w-full items-center gap-3 ${
              collapsed ? "flex-col justify-center" : "px-2 pb-6"
            }`}
          >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-lg text-white">
              ❀
            </span>
            {!collapsed ? (
              <div class="min-w-0 flex-1 leading-tight">
                <p class="text-sm font-semibold text-[var(--text-primary)]">
                  Moringa Admin
                </p>
                <p class="text-xs text-[var(--text-muted)]">
                  Management console
                </p>
              </div>
            ) : null}
            {!collapsed ? (
              <button
                type="button"
                onClick$={onToggleCollapse$}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                class="shrink-0 rounded-xl p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
              >
                ←
              </button>
            ) : null}
            {collapsed ? (
              <button
                type="button"
                onClick$={onToggleCollapse$}
                aria-label="Expand sidebar"
                title="Expand sidebar"
                class="mt-2 rounded-xl p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
              >
                →
              </button>
            ) : null}
          </div>

          <nav aria-label="Admin" class="flex w-full flex-1 flex-col gap-2">
            {ADMIN_NAV_ITEMS.map((item) =>
              collapsed ? (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick$={onClose$}
                  aria-current={
                    isActive(pathname, item.href) ? "page" : undefined
                  }
                  aria-label={item.label}
                  title={item.label}
                  class={`admin-nav-item flex h-14 w-14 flex-col items-center justify-center gap-0.5 select-none rounded-full text-xs transition-all duration-200 ${
                    isActive(pathname, item.href)
                      ? "bg-emerald-400/20 text-emerald-400 shadow-sm"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span aria-hidden="true" class="text-lg">
                    {item.icon}
                  </span>
                  <span class="truncate leading-none">{item.label}</span>
                </Link>
              ) : (
                <NavItemLink
                  key={item.href}
                  item={item}
                  active={isActive(pathname, item.href)}
                  onClick$={onClose$}
                />
              ),
            )}
          </nav>
        </aside>

        {/* Mobile drawer */}
        {open ? (
          <div class="fixed inset-0 z-50 lg:hidden">
            <div
              class="absolute left-0 top-0 flex h-full w-72 max-w-[80%] flex-col bg-[var(--bg-secondary)] px-4 py-6 shadow-xl"
              role="dialog"
              aria-modal="true"
              aria-label="Admin navigation"
            >
              <div class="flex items-center justify-between px-2 pb-6">
                <div class="flex items-center gap-3">
                  <span class="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-700 text-lg text-white">
                    ❀
                  </span>
                  <div class="leading-tight">
                    <p class="text-sm font-semibold text-[var(--text-primary)]">
                      Moringa Admin
                    </p>
                    <p class="text-xs text-[var(--text-muted)]">
                      Management console
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick$={onClose$}
                  aria-label="Close navigation"
                  title="Close navigation"
                  class="rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-muted)]"
                >
                  ✕
                </button>
              </div>
              <nav aria-label="Admin" class="flex flex-col gap-2">
                {ADMIN_NAV_ITEMS.map((item) => (
                  <NavItemLink
                    key={item.href}
                    item={item}
                    active={isActive(pathname, item.href)}
                    onClick$={onClose$}
                  />
                ))}
              </nav>
            </div>
          </div>
        ) : null}
      </>
    );
  },
);

export default AdminSidebar;
