"use client";

import { formatMediumDateTime } from "@/lib/formatters";
import { formatStatus } from "../lib/orders";
import { getOrderDisplayTitle } from "../lib/orders";

export interface SupportTicketCardProps {
  ticket: Record<string, unknown>;
}

export function SupportTicketCard({ ticket }: SupportTicketCardProps) {
  const order = ticket.order as Record<string, unknown>;

  return (
    <article
      key={ticket.id as string | number}
      className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
            {(order?.orderNumber as string) || `Order #${order?.id}`}
          </p>
          <h3 className="mt-2 font-serif text-2xl text-[var(--text-primary)]">
            {(ticket.title as string) || "Support request"}
          </h3>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {getOrderDisplayTitle(order)} ·{" "}
            {formatMediumDateTime(ticket.createdAt as string)}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <span className="inline-flex rounded-full bg-[var(--bg-muted)] px-3 py-1 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            {String(ticket.status || "OPEN").replace(/_/g, " ")}
          </span>
          <p className="mt-2 text-sm uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {String(ticket.type || "SUPPORT").replace(/_/g, " ")}
          </p>
        </div>
      </div>

      <p className="mt-5 text-sm leading-6 text-[var(--text-secondary)]">
        {ticket.description as string}
      </p>

      {ticket.adminResponse ? (
        <div className="mt-5 rounded-[1.5rem] bg-[var(--success-bg)] p-4 text-sm leading-6 text-[var(--success-text)]">
          <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--success-text)]">
            Admin response
          </p>
          <p className="mt-2">{ticket.adminResponse as string}</p>
        </div>
      ) : (
        <div className="mt-5 rounded-[1.5rem] bg-[var(--bg-primary)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
          Support has received this ticket. Updates will appear here and by
          email.
        </div>
      )}

      {ticket.resolutionSummary ? (
        <div className="mt-4 rounded-[1.5rem] bg-[var(--bg-primary)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
          <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Resolution
          </p>
          <p className="mt-2">{ticket.resolutionSummary as string}</p>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 text-sm text-[var(--text-secondary)] sm:grid-cols-2">
        <div className="rounded-[1.5rem] bg-[var(--bg-primary)] p-4">
          <p className="text-sm uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Order status
          </p>
          <p className="mt-2 font-medium text-[var(--text-primary)]">
            {formatStatus(order?.status as string)}
          </p>
        </div>
        <div className="rounded-[1.5rem] bg-[var(--bg-primary)] p-4">
          <p className="text-sm uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Ticket updated
          </p>
          <p className="mt-2 font-medium text-[var(--text-primary)]">
            {formatMediumDateTime(
              (ticket.updatedAt || ticket.createdAt) as string,
            )}
          </p>
        </div>
      </div>
    </article>
  );
}
