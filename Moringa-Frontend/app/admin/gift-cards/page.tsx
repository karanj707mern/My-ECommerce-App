"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createGiftCard,
  getAdminGiftCards,
  removeGiftCard,
  updateGiftCard,
} from "@/lib/api/gift-card";
import type { GiftCardAdmin } from "@/lib/api/gift-card";
import { useToast } from "@/hooks/useToast";
import useAutoDismiss from "@/hooks/useAutoDismiss";

export default function AdminGiftCardsPage() {
  const [giftCards, setGiftCards] = useState<GiftCardAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    code: "",
    amount: "",
    currency: "INR",
    isActive: true,
    expiresAt: "",
  });

  const toast = useToast();
  useAutoDismiss(error, () => setError(""), 5000);

  const loadGiftCards = useCallback(async () => {
    try {
      const data = (await getAdminGiftCards()) as GiftCardAdmin[];
      setGiftCards(data);
      setError("");
    } catch (err) {
      setError((err as Error).message || "Could not load gift cards.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGiftCards();
  }, [loadGiftCards]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const amount = Number(form.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Enter a valid amount.");
      }

      await createGiftCard({
        code: form.code || undefined,
        amount,
        currency: form.currency || undefined,
        isActive: form.isActive,
        expiresAt: form.expiresAt || undefined,
      });

      setForm({
        code: "",
        amount: "",
        currency: "INR",
        isActive: true,
        expiresAt: "",
      });
      toast.showToast({
        severity: "success",
        summary: "Gift card created",
        detail: "The new gift card has been generated.",
        life: 3000,
      });
      await loadGiftCards();
      setError("");
    } catch (err) {
      setError((err as Error).message || "Could not create gift card.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (giftCard: GiftCardAdmin) => {
    try {
      await updateGiftCard(giftCard.id, {
        isActive: !giftCard.isActive,
      });
      await loadGiftCards();
    } catch (err) {
      setError((err as Error).message || "Could not update gift card.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this gift card permanently?")) {
      return;
    }
    try {
      await removeGiftCard(id);
      toast.showToast({
        severity: "info",
        summary: "Gift card deleted",
        detail: "The gift card has been removed.",
        life: 3000,
      });
      await loadGiftCards();
      setError("");
    } catch (err) {
      setError((err as Error).message || "Could not delete gift card.");
    }
  };

  const formatCurrency = (amount: number, currency = "INR") =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);

  const summary = useMemo(() => {
    const total = giftCards.reduce((sum, card) => sum + card.initialAmount, 0);
    const remaining = giftCards.reduce(
      (sum, card) => sum + card.remainingAmount,
      0,
    );
    const active = giftCards.filter((card) => card.isActive).length;
    return { total, remaining, active, count: giftCards.length };
  }, [giftCards]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
          Store value
        </p>
        <h1 className="mt-3 font-serif text-3xl text-[var(--text-primary)] sm:text-4xl">
          Gift Cards
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Issue and manage gift cards. Codes are generated or set manually.
        </p>
      </div>

      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
          <p className="text-sm text-[var(--text-muted)]">Total issued</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            {formatCurrency(summary.total)}
          </p>
        </div>
        <div className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
          <p className="text-sm text-[var(--text-muted)]">Remaining balance</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700 dark:text-emerald-300">
            {formatCurrency(summary.remaining)}
          </p>
        </div>
        <div className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
          <p className="text-sm text-[var(--text-muted)]">Active cards</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            {summary.active} / {summary.count}
          </p>
        </div>
        <div className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
          <p className="text-sm text-[var(--text-muted)]">Total cards</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            {summary.count}
          </p>
        </div>
      </section>

      <section className="mb-10 rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 shadow-sm">
        <h2 className="font-serif text-2xl text-[var(--text-primary)]">
          Issue new gift card
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Create a new gift card for a customer or campaign.
        </p>
        <form
          onSubmit={handleCreate}
          className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5"
        >
          <label className="text-sm font-medium text-[var(--text-secondary)]">
            Code
            <input
              value={form.code}
              onChange={(e) =>
                setForm({ ...form, code: e.target.value.toUpperCase() })
              }
              placeholder="Auto-generated if blank"
              className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
            />
          </label>
          <label className="text-sm font-medium text-[var(--text-secondary)]">
            Amount
            <input
              type="number"
              min={1}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="1000"
              required
              className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
            />
          </label>
          <label className="text-sm font-medium text-[var(--text-secondary)]">
            Currency
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
            >
              <option value="INR">INR</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <label className="text-sm font-medium text-[var(--text-secondary)]">
            Expires at
            <input
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Creating..." : "Create gift card"}
            </button>
          </div>
        </form>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-2xl text-[var(--text-primary)]">
            All gift cards
          </h2>
          <button
            type="button"
            onClick={loadGiftCards}
            className="rounded-full border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-primary)]"
          >
            Refresh
          </button>
        </div>
        <div className="space-y-4">
          {loading ? (
            <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 text-center text-sm text-[var(--text-secondary)] shadow-sm">
              Loading gift cards...
            </div>
          ) : giftCards.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] p-6 text-center text-sm text-[var(--text-secondary)] shadow-sm">
              No gift cards yet. Use the form above to create one.
            </div>
          ) : (
            giftCards.map((giftCard) => (
              <div
                key={giftCard.id}
                className="grid gap-4 rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm md:grid-cols-[1fr_auto]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-1 text-sm font-semibold tracking-[0.08em]">
                      {giftCard.code}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] ${
                        giftCard.isActive
                          ? "bg-emerald-50 text-emerald-700 dark:text-emerald-300"
                          : "bg-red-50 text-red-700 dark:text-red-300"
                      }`}
                    >
                      {giftCard.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                    <span>
                      Initial:{" "}
                      {formatCurrency(
                        giftCard.initialAmount,
                        giftCard.currency,
                      )}
                    </span>
                    <span>
                      Remaining:{" "}
                      {formatCurrency(
                        giftCard.remainingAmount,
                        giftCard.currency,
                      )}
                    </span>
                    <span>Currency: {giftCard.currency}</span>
                    <span>Redeemed by: {giftCard.redeemedBy ?? "—"}</span>
                    <span>
                      Redeemed at:{" "}
                      {giftCard.redeemedAt
                        ? new Date(giftCard.redeemedAt).toLocaleString()
                        : "—"}
                    </span>
                    <span>
                      Expires:{" "}
                      {giftCard.expiresAt
                        ? new Date(giftCard.expiresAt).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggle(giftCard)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      giftCard.isActive
                        ? "border border-amber-200 text-amber-800 hover:bg-amber-50"
                        : "border border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                    }`}
                  >
                    {giftCard.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(giftCard.id)}
                    className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
