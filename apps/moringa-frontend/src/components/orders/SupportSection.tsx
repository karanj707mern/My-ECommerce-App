import { component$ } from "@builder.io/qwik";
import { SupportTicketCard } from "./SupportTicketCard";

export interface SupportSectionProps {
  tickets: Array<Record<string, unknown>>;
}

/** Support ticket tracker list. */
export const SupportSection = component$<SupportSectionProps>(
  ({ tickets }) => {
    return (
      <section>
        <p class="text-sm uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
          Support tickets
        </p>
        <h2 class="mt-3 font-serif text-3xl text-[var(--text-primary)] sm:text-4xl">
          Ticket tracking
        </h2>
        <div class="mt-6 space-y-5">
          {tickets.length > 0 ? (
            tickets.map((ticket) => (
              <SupportTicketCard key={String(ticket.id)} ticket={ticket} />
            ))
          ) : (
            <div class="card rounded-[2rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] p-8 text-sm text-[var(--text-secondary)] shadow-sm">
              Support tickets will appear here after you submit a return,
              refund, replacement, dispute, or shipment request.
            </div>
          )}
        </div>
      </section>
    );
  },
);

export default SupportSection;
