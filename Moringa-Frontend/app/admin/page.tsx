"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getAdminOverview,
  type AdminOverview,
  type AdminRecentIssue,
  type AdminRecentOrder,
} from "@/lib/api/admin";

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

function formatRupees(value: number) {
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

export default function AdminOverview() {
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const overview = (await getAdminOverview()) as Overview;
      setData(overview);
    } catch (err) {
      const status = (err as Error & { status?: number }).status;
      if (status === 401 || status === 403) {
        router.push("/auth?from=" + encodeURIComponent("/admin"));
        return;
      }
      setError((err as Error).message || "Could not load overview.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  return (
    <div className="space-y-8">
      <section className="admin-card p-5 shadow-sm sm:p-8">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-emerald-700">
            Dashboard
          </p>
          <h1 className="mt-2 font-serif text-2xl text-[var(--text-primary)] sm:text-3xl">
            Admin overview
          </h1>
          <p className="mt-2 text-base text-[var(--text-secondary)]">
            At-a-glance summary of store activity.
          </p>
        </div>

        {error ? (
          <div
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:text-red-300"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {STATS.map((stat) => {
            const value = data ? data[stat.valueKey as keyof AdminOverview] : 0;
            return (
              <Link
                key={stat.label}
                href={stat.href}
                aria-label={`${stat.label}: ${loading ? "loading" : value}. View ${stat.label.toLowerCase()}`}
                className="admin-card group p-5 transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    {stat.label}
                  </p>
                  <span aria-hidden="true" className="text-xl">
                    {stat.icon}
                  </span>
                </div>
                <p className="mt-4 text-3xl font-semibold text-[var(--text-primary)] sm:text-4xl">
                  {loading ? "…" : Number(value).toLocaleString("en-IN")}
                </p>
                <span
                  className={`mt-4 inline-flex h-1.5 w-8 rounded-full ${stat.color}`}
                />
                <p className="mt-3 text-sm font-medium uppercase tracking-[0.1em] text-[var(--text-muted)] group-hover:text-emerald-700">
                  View {stat.label.toLowerCase()} →
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="admin-card p-5 shadow-sm sm:p-8">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-emerald-700">
            Revenue
          </p>
          <h2 className="mt-2 font-serif text-2xl text-[var(--text-primary)] sm:text-3xl">
            Money collected
          </h2>
          <p className="mt-2 text-base text-[var(--text-secondary)]">
            Breakdown by payment method.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {REVENUE_STATS.map((stat) => {
            const value = data ? data[stat.valueKey as keyof AdminOverview] : 0;
            return (
              <div
                key={stat.label}
                className="admin-card p-5 transition hover:-translate-y-1"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    {stat.label}
                  </p>
                  <span aria-hidden="true" className="text-xl">
                    {stat.icon}
                  </span>
                </div>
                <p className="mt-4 text-3xl font-semibold text-[var(--text-primary)] sm:text-4xl">
                  {loading ? "…" : formatRupees(Number(value))}
                </p>
                <span
                  className={`mt-4 inline-flex h-1.5 w-8 rounded-full ${stat.color}`}
                />
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section
          className="admin-card p-5 shadow-sm sm:p-8"
          aria-labelledby="recent-orders-heading"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-emerald-700">
                Recent open orders
              </p>
              <h2
                className="mt-2 font-serif text-2xl text-[var(--text-primary)] sm:text-3xl"
                id="recent-orders-heading"
              >
                Shipment queue
              </h2>
            </div>
            <Link
              href="/admin/orders"
              className="text-sm font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-800"
            >
              View all
            </Link>
          </div>

          {loading ? (
            <p
              className="mt-6 text-sm text-[var(--text-secondary)]"
              aria-live="polite"
            >
              Loading…
            </p>
          ) : !data?.recentOrders.length ? (
            <p className="mt-6 text-sm text-[var(--text-secondary)]">
              No open orders right now.
            </p>
          ) : (
            <ul className="mt-6 space-y-2" aria-label="Recent open orders">
              {data.recentOrders.map((order: AdminRecentOrder) => (
                <li
                  key={order.id}
                  className="admin-card flex items-center justify-between gap-4 px-4 py-3 transition hover:border-emerald-200 hover:shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {order.orderNumber}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate">
                      {order.user?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {formatRupees(order.total)}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {statusLabel(order.status)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className="admin-card p-5 shadow-sm sm:p-8"
          aria-labelledby="recent-issues-heading"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-emerald-700">
                Support issues
              </p>
              <h2
                className="mt-2 font-serif text-2xl text-[var(--text-primary)] sm:text-3xl"
                id="recent-issues-heading"
              >
                Returns & disputes
              </h2>
            </div>
            <Link
              href="/admin/support"
              className="text-sm font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-800"
            >
              View all
            </Link>
          </div>

          {loading ? (
            <p
              className="mt-6 text-sm text-[var(--text-secondary)]"
              aria-live="polite"
            >
              Loading…
            </p>
          ) : !data?.recentIssues.length ? (
            <p className="mt-6 text-sm text-[var(--text-secondary)]">
              No support issues right now.
            </p>
          ) : (
            <ul className="mt-6 space-y-2" aria-label="Recent support issues">
              {data.recentIssues.map((issue: AdminRecentIssue) => (
                <li
                  key={issue.id}
                  className="admin-card flex items-center justify-between gap-4 px-4 py-3 transition hover:border-emerald-200 hover:shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {issue.title}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate">
                      {issue.order?.orderNumber}
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--bg-muted)] px-3 py-1 text-xs uppercase tracking-[0.1em] text-[var(--text-secondary)]">
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
}
