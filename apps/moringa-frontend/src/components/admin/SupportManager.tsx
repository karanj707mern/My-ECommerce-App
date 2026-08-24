import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";
import { getAdminIssues, updateOrderIssue } from "../../lib/api/order";
import { useToast } from "../../hooks/useToast";

function hasAuthError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === 401 || status === 403;
}

/**
 * Admin support queue: issue list with status dropdown and quick response.
 * Port of legacy `components/admin/SupportManager.tsx`.
 */
export const SupportManager = component$(() => {
  const nav = useNavigate();
  const toast = useToast();
  const issues = useSignal<Record<string, unknown>[]>([]);
  const loading = useSignal(true);
  const error = useSignal("");

  useVisibleTask$(async () => {
    try {
      loading.value = true;
      error.value = "";
      const data = await getAdminIssues();
      issues.value = Array.isArray(data)
        ? (data as Record<string, unknown>[])
        : [];
    } catch (err) {
      if (hasAuthError(err)) {
        await nav("/auth?from=" + encodeURIComponent("/admin/support"));
        return;
      }
      error.value =
        err instanceof Error && err.message
          ? err.message
          : "Could not load support issues.";
    } finally {
      loading.value = false;
    }
  });

  const handleIssueUpdate = $(
    async (issueId: string | number, payload: Record<string, unknown>) => {
      try {
        const updatedIssue = (await updateOrderIssue(
          issueId,
          payload,
        )) as Record<string, unknown>;
        issues.value = issues.value.map((issue) =>
          issue.id === issueId ? updatedIssue : issue,
        );
        await toast.showToast({
          severity: "success",
          summary: "Success",
          detail: "Support issue updated successfully.",
          life: 4000,
        });
        error.value = "";
      } catch (err) {
        error.value =
          err instanceof Error && err.message
            ? err.message
            : "Could not update the issue.";
      }
    },
  );

  return (
    <section class="admin-card p-4 shadow-sm sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-sm uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300">
            Support issues
          </p>
          <h2 class="mt-1 font-serif text-xl text-[var(--text-primary)] sm:text-2xl">
            Returns, refunds, disputes
          </h2>
        </div>
      </div>

      {error.value ? (
        <div
          class="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:text-red-300"
          role="alert"
        >
          {error.value}
        </div>
      ) : null}

      <div class="mt-6 space-y-3">
        {loading.value ? (
          <div class="admin-card-static p-5 text-sm text-[var(--text-secondary)]">
            Loading support issues…
          </div>
        ) : issues.value.length > 0 ? (
          issues.value.map((issue) => {
            const order = issue.order as Record<string, unknown> | undefined;
            return (
              <article key={String(issue.id)} class="admin-card p-4">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p class="text-xs uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                      {(order?.orderNumber as string) ||
                        `Order #${String(order?.id)}`}
                    </p>
                    <h3 class="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                      {issue.title as string}
                    </h3>
                    <p class="mt-1 text-xs text-[var(--text-muted)]">
                      {(order?.orderTitle as string) ?? ""} ·{" "}
                      {((issue.user as Record<string, unknown>)?.name as string) ??
                        ""}{" "}
                      ·{" "}
                      {((issue.user as Record<string, unknown>)?.email as string) ??
                        ""}
                    </p>
                  </div>
                  <div class="text-left sm:text-right">
                    <p class="text-xs text-[var(--text-muted)]">
                      {String(issue.type).replace(/_/g, " ")}
                    </p>
                    <p class="mt-0.5 text-sm font-medium text-[var(--text-primary)]">
                      {String(issue.status).replace(/_/g, " ")}
                    </p>
                  </div>
                </div>

                <p class="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  {issue.description as string}
                </p>

                <div class="mt-3 grid gap-2.5 md:grid-cols-[200px_1fr]">
                  <select
                    value={issue.status as string}
                    onChange$={(_, el) =>
                      handleIssueUpdate(issue.id as string | number, {
                        status: el.value,
                      })
                    }
                    class="rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-200"
                    aria-label="Support issue status"
                  >
                    <option value="OPEN">Open</option>
                    <option value="UNDER_REVIEW">Under review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                  <button
                    type="button"
                    onClick$={() =>
                      handleIssueUpdate(issue.id as string | number, {
                        adminResponse:
                          (issue.adminResponse as string) ||
                          "We reviewed your request and updated the support ticket.",
                        resolutionSummary:
                          (issue.resolutionSummary as string) ||
                          "We reviewed your request and updated the support ticket.",
                      })
                    }
                    class="btn-secondary px-3 py-1.5 text-sm"
                  >
                    Apply quick response
                  </button>
                </div>

                {issue.adminResponse ? (
                  <p class="mt-2.5 text-sm text-[var(--text-secondary)]">
                    Admin: {issue.adminResponse as string}
                  </p>
                ) : null}
                {issue.resolutionSummary ? (
                  <p class="mt-1.5 text-sm text-[var(--text-secondary)]">
                    Resolution: {issue.resolutionSummary as string}
                  </p>
                ) : null}
              </article>
            );
          })
        ) : (
          <div class="rounded-[1.5rem] border border-dashed border-[var(--border-color)] bg-[var(--bg-muted)] p-5 text-sm text-[var(--text-muted)]">
            No support issues are waiting for review right now.
          </div>
        )}
      </div>
    </section>
  );
});

export default SupportManager;
