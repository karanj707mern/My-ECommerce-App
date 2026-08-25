import { component$, type PropFunction } from "@builder.io/qwik";
import OrderProgressStrip from "./OrderProgressStrip";
import { formatMediumDateTime, formatRupees } from "../../lib/formatters";
import {
  canDownloadInvoice,
  formatStatus,
  getIssueTypeOptions,
  statusTone,
} from "../../lib/orders";
import {
  OrderBreakdown,
  OrderDeliveryDetails,
  OrderDetails,
  OrderShippingAddress,
  TrackingActivity,
} from "./OrderDetails";

export interface IssueFormState {
  type?: string;
  title?: string;
  description?: string;
}

export interface OrderCardProps {
  order: Record<string, unknown>;
  cancellingOrderId: string | null;
  issueForms: Record<string, IssueFormState>;
  onCancel$: PropFunction<(order: Record<string, unknown>) => void>;
  onInvoice$: PropFunction<(orderId: string | number) => void>;
  onIssueFieldChange$: PropFunction<
    (orderId: string | number, field: string, value: string) => void
  >;
  onIssueSubmit$: PropFunction<(orderId: string | number) => void>;
}

const ACTIVE_ISSUE = ["OPEN", "UNDER_REVIEW", "APPROVED"];

/** Full order card: progress, details, breakdown, tracking, support form. */
export const OrderCard = component$<OrderCardProps>(
  ({
    order,
    cancellingOrderId,
    issueForms,
    onCancel$,
    onInvoice$,
    onIssueFieldChange$,
    onIssueSubmit$,
  }) => {
    const orderId = String(order.id);
    const issues = (order.issues as Record<string, unknown>[]) || [];
    const activeIssue = issues.find((issue) =>
      ACTIVE_ISSUE.includes(issue.status as string),
    );
    const issueTypeOptions = getIssueTypeOptions(order);

    const formType = issueForms[orderId]?.type;
    const selectedIssueType = issueTypeOptions.some(
      (option) => option.value === formType,
    )
      ? (formType as string)
      : (issueTypeOptions[0]?.value ?? "");

    const supportFormDisabled =
      Boolean(activeIssue) || issueTypeOptions.length === 0;

    return (
      <article class="card rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-sm uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
              {(order.orderNumber as string) || `Order #${String(order.id)}`}
            </p>
            <h3 class="mt-2 font-serif text-2xl text-[var(--text-primary)]">
              {(order.orderTitle as string) ||
                ((
                  (order.items as Record<string, unknown>[] | undefined)?.[0]
                    ?.product as Record<string, unknown> | undefined
                )?.name as string) ||
                `Order ${order.orderNumber || order.id}`}
            </h3>
            <p class="mt-2 text-sm text-[var(--text-muted)]">
              {formatMediumDateTime(order.createdAt as string)}
            </p>
            {order.invoiceNumber ? (
              <p class="mt-1 text-sm text-[var(--text-muted)]">
                Invoice {order.invoiceNumber as string}
              </p>
            ) : null}
          </div>
          <div class="text-right">
            <span
              class={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusTone(order.status as string)}`}
            >
              {formatStatus(order.status as string)}
            </span>
            <p class="mt-3 text-xl font-semibold text-[var(--text-primary)]">
              {formatRupees(order.total as number)}
            </p>
          </div>
        </div>

        <OrderProgressStrip
          status={
            order.status as
              | "PENDING"
              | "PAID"
              | "SHIPPED"
              | "OUT_FOR_DELIVERY"
              | "DELIVERED"
              | "CANCELLED"
          }
          class="mt-6"
        />

        <OrderDetails order={order} />

        <OrderBreakdown order={order} />

        <TrackingActivity order={order} />

        <OrderDeliveryDetails order={order} />

        <OrderShippingAddress order={order} />

        <div class="mt-6 flex flex-wrap gap-3">
          {canDownloadInvoice(order) ? (
            <button
              type="button"
              onClick$={() => onInvoice$(order.id as string | number)}
              class="rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-primary)]"
            >
              View invoice
            </button>
          ) : (
            <span class="rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-2 text-sm text-[var(--text-muted)]">
              Invoice after payment
            </span>
          )}
          {(order.canCustomerCancel as boolean) ? (
            <button
              type="button"
              onClick$={() => onCancel$(order)}
              disabled={cancellingOrderId === orderId}
              class="rounded-full border border-[var(--danger-border)] px-4 py-2 text-sm text-[var(--danger-text)] transition hover:bg-[var(--danger-bg)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancellingOrderId === orderId ? "Cancelling..." : "Cancel order"}
            </button>
          ) : null}
        </div>

        {order.customerCancellationMessage ? (
          <p class="mt-3 text-sm leading-5 text-[var(--text-muted)]">
            {order.customerCancellationMessage as string}
          </p>
        ) : null}

        <div class="mt-6 rounded-[1.5rem] bg-[var(--bg-primary)] p-4 text-sm text-[var(--text-secondary)]">
          <p class="text-sm uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
            Order support
          </p>
          {issues.length > 0 ? (
            <div class="mt-4 space-y-3">
              {issues.map((issue) => (
                <div
                  key={String(issue.id)}
                  class="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3"
                >
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <p class="font-medium text-[var(--text-primary)]">
                      {issue.title as string}
                    </p>
                    <span class="text-sm uppercase tracking-[0.1em] text-[var(--text-muted)]">
                      {String(issue.status).replace(/_/g, " ")}
                    </span>
                  </div>
                  <p class="mt-1 text-sm text-[var(--text-muted)]">
                    {formatMediumDateTime(issue.createdAt as string)}
                  </p>
                  <p class="mt-2">{issue.description as string}</p>
                  {issue.adminResponse ? (
                    <p class="mt-2 text-[var(--text-secondary)]">
                      Admin: {issue.adminResponse as string}
                    </p>
                  ) : null}
                  {issue.resolutionSummary ? (
                    <p class="mt-2 text-[var(--text-secondary)]">
                      Resolution: {issue.resolutionSummary as string}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          <div class="mt-4 grid gap-3 md:grid-cols-2">
            <select
              value={selectedIssueType}
              onChange$={(_, el) =>
                onIssueFieldChange$(
                  order.id as string | number,
                  "type",
                  el.value,
                )
              }
              disabled={supportFormDisabled}
              aria-label="Support request type"
              class="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
            >
              {issueTypeOptions.length > 0 ? (
                issueTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))
              ) : (
                <option value="">No support request available</option>
              )}
            </select>
            <input
              placeholder="Issue title"
              aria-label="Issue title"
              value={issueForms[orderId]?.title ?? ""}
              onInput$={(_, el) =>
                onIssueFieldChange$(
                  order.id as string | number,
                  "title",
                  el.value,
                )
              }
              disabled={supportFormDisabled}
              class="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
            />
          </div>

          {(order.status as string) === "DELIVERED" ? (
            <p class="mt-3 text-sm leading-5 text-[var(--text-muted)]">
              Returns, refunds, and replacements are available for 7 days after
              delivery.
            </p>
          ) : null}

          <textarea
            placeholder="Describe the issue"
            aria-label="Describe the issue"
            value={issueForms[orderId]?.description ?? ""}
            onInput$={(_, el) =>
              onIssueFieldChange$(
                order.id as string | number,
                "description",
                el.value,
              )
            }
            disabled={supportFormDisabled}
            class="mt-3 min-h-24 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
          />

          {activeIssue ? (
            <p class="mt-3 text-sm leading-5 text-[var(--text-muted)]">
              This order already has an active support request under review.
            </p>
          ) : null}

          <button
            type="button"
            onClick$={() => onIssueSubmit$(order.id as string | number)}
            disabled={supportFormDisabled}
            class="btn-secondary mt-3"
          >
            Submit support request
          </button>
        </div>
      </article>
    );
  },
);

export default OrderCard;
