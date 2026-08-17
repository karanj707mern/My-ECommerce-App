"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminIssues, updateOrderIssue } from "@/lib/api/order";
import { useToast } from "@/hooks/useToast";

export default function SupportManager() {
  const router = useRouter();
  const toast = useToast();
  const [issues, setIssues] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadIssues = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getAdminIssues();
      setIssues(Array.isArray(data) ? (data as Record<string, unknown>[]) : []);
    } catch (err) {
      if (
        (err as Error & { status: number }).status === 401 ||
        (err as Error & { status: number }).status === 403
      ) {
        router.push("/auth?from=" + encodeURIComponent("/admin/support"));
        return;
      }
      setError((err as Error).message || "Could not load support issues.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  const handleIssueUpdate = async (
    issueId: string | number,
    payload: Record<string, unknown>,
  ) => {
    try {
      const updatedIssue = (await updateOrderIssue(issueId, payload)) as Record<
        string,
        unknown
      >;
      setIssues((current) =>
        current.map((issue) => (issue.id === issueId ? updatedIssue : issue)),
      );
      toast.showToast({
        severity: "success",
        summary: "Success",
        detail: "Support issue updated successfully.",
        life: 4000,
      });
      setError("");
    } catch (err) {
      setError((err as Error).message || "Could not update the issue.");
    }
  };

  return (
    <section className="admin-card p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300">
            Support issues
          </p>
          <h2 className="mt-1 font-serif text-xl text-[var(--text-primary)] sm:text-2xl">
            Returns, refunds, disputes
          </h2>
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="admin-card-static p-5 text-sm text-[var(--text-secondary)]">
            Loading support issues…
          </div>
        ) : issues.length > 0 ? (
          issues.map((issue) => (
            <article
              key={issue.id as string | number}
              className="admin-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                    {((issue.order as Record<string, unknown>)
                      ?.orderNumber as string) ||
                      `Order #${(issue.order as Record<string, unknown>)?.id}`}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                    {issue.title as string}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {
                      (issue.order as Record<string, unknown>)
                        ?.orderTitle as string
                    }{" "}
                    · {(issue.user as Record<string, unknown>)?.name as string}{" "}
                    · {(issue.user as Record<string, unknown>)?.email as string}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs text-[var(--text-muted)]">
                    {(issue.type as string).replace(/_/g, " ")}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">
                    {(issue.status as string).replace(/_/g, " ")}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                {issue.description as string}
              </p>

              <div className="mt-3 grid gap-2.5 md:grid-cols-[200px_1fr]">
                <select
                  value={issue.status as string}
                  onChange={(event) =>
                    handleIssueUpdate(issue.id as string | number, {
                      status: event.target.value,
                    })
                  }
                  className="rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-200"
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
                  onClick={() =>
                    handleIssueUpdate(issue.id as string | number, {
                      adminResponse:
                        (issue.adminResponse as string) ||
                        "We reviewed your request and updated the support ticket.",
                      resolutionSummary:
                        (issue.resolutionSummary as string) ||
                        "We reviewed your request and updated the support ticket.",
                    })
                  }
                  className="btn-secondary px-3 py-1.5 text-sm"
                >
                  Apply quick response
                </button>
              </div>

              {(issue.adminResponse as string) ? (
                <p className="mt-2.5 text-sm text-[var(--text-secondary)]">
                  Admin: {issue.adminResponse as string}
                </p>
              ) : null}
              {(issue.resolutionSummary as string) ? (
                <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
                  Resolution: {issue.resolutionSummary as string}
                </p>
              ) : null}
            </article>
          ))
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-[var(--border-color)] bg-[var(--bg-muted)] p-5 text-sm text-[var(--text-muted)]">
            No support issues are waiting for review right now.
          </div>
        )}
      </div>
    </section>
  );
}
