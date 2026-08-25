import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { Link, useNavigate, type DocumentHead } from "@builder.io/qwik-city";
import {
  getAdminOverview,
  type AdminOverview,
  type AdminRecentOrder,
  type AdminRecentIssue,
} from "../../lib/api/admin";
import { useAuthState } from "../../hooks/useAuthState";

type Overview = AdminOverview;

const STATS = [
  {
    label: "Products",
    valueKey: "productCount",
    href: "/admin/products",
    color: "bg-emerald-700",
    icon: "📦",
  },
  {
    label: "Open orders",
    valueKey: "openOrderCount",
    href: "/admin/orders",
    color: "bg-sky-700",
    icon: "🧾",
  },
  {
    label: "Cancelled orders",
    valueKey: "cancelledOrderCount",
    href: "/admin/orders",
    color: "bg-red-700",
    icon: "🚫",
  },
  {
    label: "Support issues",
    valueKey: "issueCount",
    href: "/admin/support",
    color: "bg-amber-700",
    icon: "⚠️",
  },
  {
    label: "Blog posts",
    valueKey: "blogCount",
    href: "/admin/blog",
    color: "bg-stone-800",
    icon: "✎",
  },
] as const;

const REVENUE_STATS = [
  {
    label: "Cash on delivery",
    valueKey: "codCollected",
    color: "bg-amber-500",
    icon: "💵",
  },
  {
    label: "Online payments",
    valueKey: "onlineCollected",
    color: "bg-emerald-600",
    icon: "💳",
  },
] as const;

function formatRupees(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function statusLabel(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Admin dashboard overview. Port of legacy `app/admin/page.tsx`.
 */
const AdminOverviewPage = component$(() => {
  const nav = useNavigate();
  const { authChecked } = useAuthState();

  const data = useSignal<Overview | null>(null);
  const loading = useSignal(true);
  const error = useSignal("");

  useVisibleTask$(async ({ track }) => {
    if (!track(authChecked)) return;
    try {
      loading.value = true;
      error.value = "";
      data.value = (await getAdminOverview()) as Overview;
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401 || status === 403) {
        await nav("/auth?from=" + encodeURIComponent("/admin"));
        return;
      }
      error.value =
        err instanceof Error && err.message
          ? err.message
          : "Could not load overview.";
    } finally {
      loading.value = false;
    }
  });

  return (
    <div class="space-y-8">
      <section class="admin-card p-5 shadow-sm sm:p-8">
        <div>
          <p class="text-sm uppercase tracking-[0.18em] text-emerald-700">
            Dashboard
          </p>
          <h1 class="mt-2 font-serif text-2xl text-[var(--text-primary)] sm:text-3xl">
            Admin overview
          </h1>
          <p class="mt-2 text-base text-[var(--text-secondary)]">
            At-a-glance summary of store activity.
          </p>
        </div>

        {error.value ? (
          <div
            class="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:text-red-300"
            role="alert"
          >
            {error.value}
          </div>
        ) : null}

        <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {STATS.map((stat) => {
            const value = data.value
              ? (data.value[stat.valueKey as keyof Overview] as number)
              : 0;
            return (
              <Link
                key={stat.label}
                href={stat.href}
                aria-label={`${stat.label}: ${loading.value ? "loading" : value}. View ${stat.label.toLowerCase()}`}
                class="admin-card group p-5 transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
              >
                <div class="flex items-center justify-between">
                  <p class="text-sm uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    {stat.label}
                  </p>
                  <span aria-hidden="true" class="text-xl">
                    {stat.icon}
                  </span>
                </div>
                <p class="mt-4 text-3xl font-semibold text-[var(--text-primary)] sm:text-4xl">
                  {loading.value
                    ? "…"
                    : Number(value ?? 0).toLocaleString("en-IN")}
                </p>
                <span
                  class={`mt-4 inline-flex h-1.5 w-8 rounded-full ${stat.color}`}
                />
                <p class="mt-3 text-sm font-medium uppercase tracking-[0.1em] text-[var(--text-muted)] group-hover:text-emerald-700">
                  View {stat.label.toLowerCase()} →
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section class="admin-card p-5 shadow-sm sm:p-8">
        <div>
          <p class="text-sm uppercase tracking-[0.18em] text-emerald-700">
            Revenue
          </p>
          <h2 class="mt-2 font-serif text-2xl text-[var(--text-primary)] sm:text-3xl">
            Money collected
          </h2>
          <p class="mt-2 text-base text-[var(--text-secondary)]">
            Breakdown by payment method.
          </p>
        </div>

        <div class="mt-8 grid gap-4 sm:grid-cols-2">
          {REVENUE_STATS.map((stat) => {
            const value = data.value
              ? (data.value[stat.valueKey as keyof Overview] as number)
              : 0;
            return (
              <div
                key={stat.label}
                class="admin-card p-5 transition hover:-translate-y-1"
              >
                <div class="flex items-center justify-between">
                  <p class="text-sm uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    {stat.label}
                  </p>
                  <span aria-hidden="true" class="text-xl">
                    {stat.icon}
                  </span>
                </div>
                <p class="mt-4 text-3xl font-semibold text-[var(--text-primary)] sm:text-4xl">
                  {loading.value ? "…" : formatRupees(Number(value ?? 0))}
                </p>
                <span
                  class={`mt-4 inline-flex h-1.5 w-8 rounded-full ${stat.color}`}
                />
              </div>
            );
          })}
        </div>
      </section>

      <div class="grid gap-8 lg:grid-cols-2">
        <section
          class="admin-card p-5 shadow-sm sm:p-8"
          aria-labelledby="recent-orders-heading"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm uppercase tracking-[0.18em] text-emerald-700">
                Recent open orders
              </p>
              <h2
                class="mt-2 font-serif text-2xl text-[var(--text-primary)] sm:text-3xl"
                id="recent-orders-heading"
              >
                Shipment queue
              </h2>
            </div>
            <Link
              href="/admin/orders"
              class="text-sm font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-800"
            >
              View all
            </Link>
          </div>

          {loading.value ? (
            <p
              class="mt-6 text-sm text-[var(--text-secondary)]"
              aria-live="polite"
            >
              Loading…
            </p>
          ) : !data.value?.recentOrders.length ? (
            <p class="mt-6 text-sm text-[var(--text-secondary)]">
              No open orders right now.
            </p>
          ) : (
            <ul class="mt-6 space-y-2" aria-label="Recent open orders">
              {data.value.recentOrders.map((order: AdminRecentOrder) => (
                <li
                  key={order.id}
                  class="admin-card flex items-center justify-between gap-4 px-4 py-3 transition hover:border-emerald-200 hover:shadow-sm"
                >
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-[var(--text-primary)]">
                      {order.orderNumber}
                    </p>
                    <p class="truncate text-xs text-[var(--text-muted)]">
                      {order.user?.name}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-semibold text-[var(--text-primary)]">
                      {formatRupees(order.total)}
                    </p>
                    <p class="text-xs text-[var(--text-muted)]">
                      {statusLabel(order.status)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          class="admin-card p-5 shadow-sm sm:p-8"
          aria-labelledby="recent-issues-heading"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm uppercase tracking-[0.18em] text-emerald-700">
                Support issues
              </p>
              <h2
                class="mt-2 font-serif text-2xl text-[var(--text-primary)] sm:text-3xl"
                id="recent-issues-heading"
              >
                Returns & disputes
              </h2>
            </div>
            <Link
              href="/admin/support"
              class="text-sm font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-800"
            >
              View all
            </Link>
          </div>

          {loading.value ? (
            <p
              class="mt-6 text-sm text-[var(--text-secondary)]"
              aria-live="polite"
            >
              Loading…
            </p>
          ) : !data.value?.recentIssues.length ? (
            <p class="mt-6 text-sm text-[var(--text-secondary)]">
              No support issues right now.
            </p>
          ) : (
            <ul class="mt-6 space-y-2" aria-label="Recent support issues">
              {data.value.recentIssues.map((issue: AdminRecentIssue) => (
                <li
                  key={issue.id}
                  class="admin-card flex items-center justify-between gap-4 px-4 py-3 transition hover:border-emerald-200 hover:shadow-sm"
                >
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-[var(--text-primary)]">
                      {issue.title}
                    </p>
                    <p class="truncate text-xs text-[var(--text-muted)]">
                      {issue.order?.orderNumber}
                    </p>
                  </div>
                  <span class="rounded-full bg-[var(--bg-muted)] px-3 py-1 text-xs uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                    {statusLabel(issue.status)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
});

export default AdminOverviewPage;

export const head: DocumentHead = { title: "Admin Overview" };
