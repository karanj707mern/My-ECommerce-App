"use client";

import { useState } from "react";
import { getGiftCardBalance, redeemGiftCard } from "@/lib/api/gift-card";
import type { GiftCardBalance } from "@/lib/api/gift-card";
import { useToast } from "@/hooks/useToast";
import useAutoDismiss from "@/hooks/useAutoDismiss";

export default function GiftCardsPage() {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [balance, setBalance] = useState<GiftCardBalance | null>(null);
  const [error, setError] = useState("");

  const toast = useToast();
  useAutoDismiss(error, () => setError(""), 5000);

  const handleCheckBalance = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const data = (await getGiftCardBalance(code)) as GiftCardBalance;
      setBalance(data);
      setError("");
    } catch (err) {
      setBalance(null);
      setError((err as Error).message || "Could not load gift card balance.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRedeem = async () => {
    setSubmitting(true);
    try {
      const data = (await redeemGiftCard(code)) as GiftCardBalance;
      setBalance(data);
      setCode("");
      toast.showToast({
        severity: "success",
        summary: "Gift card redeemed",
        detail: "The gift card has been applied to your account.",
        life: 3000,
      });
      setError("");
    } catch (err) {
      setError((err as Error).message || "Could not redeem gift card.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number, currency = "INR") =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-24 text-[var(--text-primary)] theme-transition">
      <main>
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-2xl">
            <div className="mb-8">
              <p className="text-sm uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                Store credit
              </p>
              <h1 className="mt-3 font-serif text-3xl text-[var(--text-primary)] sm:text-4xl">
                Gift Cards
              </h1>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Enter your gift card code to check its balance or redeem it.
              </p>
            </div>

            {error ? (
              <div className="mb-6 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
                {error}
              </div>
            ) : null}

            <form
              onSubmit={handleCheckBalance}
              className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 shadow-sm"
            >
              <label className="text-sm font-medium text-[var(--text-secondary)]">
                Gift card code
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ENTER YOUR CODE"
                  required
                  className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm font-semibold tracking-[0.08em] text-[var(--text-primary)] outline-none transition focus:border-emerald-500 placeholder:text-center placeholder:text-sm placeholder:font-normal placeholder:text-[var(--text-muted)]"
                />
              </label>
              <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? "Checking..." : "Check balance"}
                </button>
                {balance && balance.isActive && balance.remainingAmount > 0 ? (
                  <button
                    type="button"
                    onClick={handleRedeem}
                    disabled={submitting}
                    className="whitespace-nowrap rounded-[2rem] border border-[var(--success-border)] px-4 py-2.5 text-sm font-semibold text-[var(--success-text)] transition hover:bg-[var(--success-bg)] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {submitting ? "Redeeming..." : "Redeem now"}
                  </button>
                ) : null}
              </div>
            </form>

            {balance ? (
              <div className="mt-8 rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">
                      Gift card
                    </p>
                    <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                      {balance.code}
                    </p>
                  </div>
                   <span
                     className={`rounded-full px-3 py-1 text-sm font-semibold ${
                       balance.isActive
                         ? "bg-emerald-50 text-emerald-700 dark:text-emerald-300"
                         : "bg-[var(--danger-bg)] text-[var(--danger-text)]"
                     }`}
                   >
                    {balance.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">
                      Initial amount
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                      {formatCurrency(balance.initialAmount, balance.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">
                      Remaining balance
                    </p>
                    <p className="mt-1 text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                      {formatCurrency(
                        balance.remainingAmount,
                        balance.currency,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Currency</p>
                    <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                      {balance.currency}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">
                      Redeemed at
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                      {balance.redeemedAt
                        ? new Date(balance.redeemedAt).toLocaleString()
                        : "Not redeemed"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">
                      Expires at
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                      {balance.expiresAt
                        ? new Date(balance.expiresAt).toLocaleDateString()
                        : "No expiry"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">
                      Last used
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                      {balance.lastUsedAt
                        ? new Date(balance.lastUsedAt).toLocaleString()
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
