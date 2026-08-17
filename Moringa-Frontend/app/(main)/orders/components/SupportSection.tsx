"use client";

import type { Order } from "../hooks/useOrdersLogic";
import { SupportTicketCard } from "./SupportTicketCard";

export interface SupportSectionProps {
  tickets: Array<Record<string, unknown> & { order: Order }>;
}

export function SupportSection({ tickets }: SupportSectionProps) {
  return (
    <section>
      <p className="text-sm uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
        Support tickets
      </p>
      <h2 className="mt-3 font-serif text-3xl text-[var(--text-primary)] sm:text-4xl">
        Ticket tracking
      </h2>
      <div className="mt-6 space-y-5">
        {tickets.length > 0 ? (
          tickets.map((ticket) => (
            <SupportTicketCard
              key={ticket.id as string | number}
              ticket={ticket}
            />
          ))
        ) : (
          <div className="rounded-[2rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] p-8 text-sm text-[var(--text-secondary)] shadow-sm card">
            Support tickets will appear here after you submit a return, refund,
            replacement, dispute, or shipment request.
          </div>
        )}
      </div>
    </section>
  );
}
