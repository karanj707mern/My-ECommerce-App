import { component$ } from "@builder.io/qwik";
import { formatMediumDateTime } from "../../lib/formatters";
import { formatStatus, getOrderDisplayTitle } from "../../lib/orders";

export interface SupportTicketCardProps {
  ticket: Record<string, unknown>;
}

/** Single support-ticket card with admin response and resolution blocks. */
export const SupportTicketCard = component$<SupportTicketCardProps>(
  ({ ticket }) => {
    const order = ticket.order as Record<string, unknown>;

    return (
      <article class="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0">
            <p class="text-sm uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
              {(order?.orderNumber as string) || `Order #${String(order?.id)}`}
            </p>
            <h3 class="mt-2 font-serif text-2xl text-[var(--text-primary)]">
              {(ticket.title as string) || "Support request"}
            </h3>
            <p class="mt-2 text-sm text-[var(--text-muted)]">
              {getOrderDisplayTitle(order)} ·{" "}
              {formatMediumDateTime(ticket.createdAt as string)}
            </p>
          </div>
          <div class="text-left sm:text-right">
            <span class="inline-flex rounded-full bg-[var(--bg-muted)] px-3 py-1 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
              {String(ticket.status || "OPEN").replace(/_/g, " ")}
            </span>
            <p class="mt-2 text-sm uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {String(ticket.type || "SUPPORT").replace(/_/g, " ")}
            </p>
          </div>
        </div>

        <p class="mt-5 text-sm leading-6 text-[var(--text-secondary)]">
          {ticket.description as string}
        </p>

        {ticket.adminResponse ? (
          <div class="mt-5 rounded-[1.5rem] bg-[var(--success-bg)] p-4 text-sm leading-6 text-[var(--success-text)]">
            <p class="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--success-text)]">
              Admin response
            </p>
            <p class="mt-2">{ticket.adminResponse as string}</p>
          </div>
        ) : (
          <div class="mt-5 rounded-[1.5rem] bg-[var(--bg-primary)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
            Support has received this ticket. Updates will appear here and by
            email.
          </div>
        )}

        {ticket.resolutionSummary ? (
          <div class="mt-4 rounded-[1.5rem] bg-[var(--bg-primary)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
            <p class="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              Resolution
            </p>
            <p class="mt-2">{ticket.resolutionSummary as string}</p>
          </div>
        ) : null}

        <div class="mt-5 grid gap-3 text-sm text-[var(--text-secondary)] sm:grid-cols-2">
          <div class="rounded-[1.5rem] bg-[var(--bg-primary)] p-4">
            <p class="text-sm uppercase tracking-[0.1em] text-[var(--text-muted)]">
              Order status
            </p>
            <p class="mt-2 font-medium text-[var(--text-primary)]">
              {formatStatus(order?.status as string)}
            </p>
          </div>
          <div class="rounded-[1.5rem] bg-[var(--bg-primary)] p-4">
            <p class="text-sm uppercase tracking-[0.1em] text-[var(--text-muted)]">
              Ticket updated
            </p>
            <p class="mt-2 font-medium text-[var(--text-primary)]">
              {formatMediumDateTime(
                (ticket.updatedAt || ticket.createdAt) as string,
              )}
            </p>
          </div>
        </div>
      </article>
    );
  },
);

export default SupportTicketCard;
