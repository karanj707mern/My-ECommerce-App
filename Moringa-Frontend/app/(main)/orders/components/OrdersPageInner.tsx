"use client";

import Link from "next/link";
import AdminRedirect from "@/components/admin/AdminRedirect";
import { useOrdersLogic } from "../hooks/useOrdersLogic";
import { OrdersSection } from "./OrdersSection";
import { SupportSection } from "./SupportSection";

export function OrdersPageInner() {
  const {
    error,
    loading,
    cancellingOrderId,
    searchTerm,
    orderSortOption,
    issueForms,
    selectedView,
    currentUserId,
    sortedCurrentOrders,
    sortedCompletedOrders,
    sortedCancelledOrders,
    sortedSupportTickets,
    trackingLinks,
    setSearchTerm,
    setOrderSortOption,
    handleIssueFieldChange,
    handleIssueSubmit,
    handleInvoiceDownload,
    handleOrderCancel,
  } = useOrdersLogic();

  const handleSignIn = () => {
    window.location.href =
      "/auth?from=" +
      encodeURIComponent("/orders") +
      "&authMessage=" +
      encodeURIComponent("Sign in to view your orders.");
  };

  const renderSelectedView = () => {
    switch (selectedView) {
      case "delivered":
        return (
          <OrdersSection
            eyebrow="Delivered orders"
            title="Delivered and completed"
            emptyMessage="Completed orders will appear here once they are delivered."
            orders={sortedCompletedOrders}
            cancellingOrderId={cancellingOrderId}
            issueForms={issueForms}
            onCancel={handleOrderCancel}
            onInvoice={handleInvoiceDownload}
            onIssueFieldChange={handleIssueFieldChange}
            onIssueSubmit={handleIssueSubmit}
          />
        );
      case "cancelled":
        return (
          <OrdersSection
            eyebrow="Cancelled orders"
            title="Cancelled"
            emptyMessage="Cancelled orders will appear here separately."
            orders={sortedCancelledOrders}
            cancellingOrderId={cancellingOrderId}
            issueForms={issueForms}
            onCancel={handleOrderCancel}
            onInvoice={handleInvoiceDownload}
            onIssueFieldChange={handleIssueFieldChange}
            onIssueSubmit={handleIssueSubmit}
          />
        );
      case "support":
        return <SupportSection tickets={sortedSupportTickets} />;
      default:
        return (
          <OrdersSection
            eyebrow="Current orders"
            title="Orders in progress"
            emptyMessage="You do not have any active orders right now."
            orders={sortedCurrentOrders}
            cancellingOrderId={cancellingOrderId}
            issueForms={issueForms}
            onCancel={handleOrderCancel}
            onInvoice={handleInvoiceDownload}
            onIssueFieldChange={handleIssueFieldChange}
            onIssueSubmit={handleIssueSubmit}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-24 text-[var(--text-primary)] theme-transition">
      <AdminRedirect />
      <main>
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
          {error ? (
            <div className="mb-8 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
              {error}
            </div>
          ) : null}

          {!currentUserId ? (
            <div className="mb-8 rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 shadow-sm card">
              <p className="text-base text-[var(--text-secondary)]">
                You are viewing your orders as a guest. Sign in to view your
                order history, track deliveries, and manage returns.
              </p>
              <button
                type="button"
                onClick={handleSignIn}
                className="btn-primary mt-4"
              >
                Sign in to view orders
              </button>
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 text-center text-[var(--text-secondary)] shadow-sm sm:p-10 card">
              Loading your orders...
            </div>
          ) : (
            <div>
              <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {trackingLinks.map((link) => {
                  const isSelected = link.key === selectedView;

                  return (
                    <Link
                      key={link.key}
                      href={link.path}
                      className={`rounded-[1.5rem] border px-4 py-4 text-left transition ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50 text-emerald-950"
                          : "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-emerald-300"
                      }`}
                    >
                      <span className="text-sm font-semibold">
                        {link.label}
                      </span>
                      <span className="mt-2 block text-2xl font-semibold">
                        {link.count}
                      </span>
                    </Link>
                  );
                })}
              </div>

              <div className="mb-8 grid gap-3 rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm md:grid-cols-[1fr_auto] lg:grid-cols-[1fr_220px] card">
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search orders, products, invoices, or support tickets"
                  aria-label="Search orders"
                  className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                />
                <select
                  value={orderSortOption}
                  onChange={(event) => setOrderSortOption(event.target.value)}
                  className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name">Product name</option>
                </select>
              </div>

              {renderSelectedView()}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
