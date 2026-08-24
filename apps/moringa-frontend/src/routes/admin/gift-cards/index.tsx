import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import {
  createGiftCard,
  getAdminGiftCards,
  removeGiftCard,
  updateGiftCard,
  type GiftCardAdmin,
} from "../../../lib/api/gift-card";
import { useToast } from "../../../hooks/useToast";
import { useAutoDismiss } from "../../../hooks/useAutoDismiss";

function formatCurrency(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Admin gift-card management: issue, toggle, delete with summary cards.
 * Port of legacy `app/admin/gift-cards/page.tsx`.
 */
const AdminGiftCardsContent = component$(() => {
  const giftCards = useSignal<GiftCardAdmin[]>([]);
  const loading = useSignal(true);
  const submitting = useSignal(false);
  const error = useSignal("");

  const form = useSignal({
    code: "",
    amount: "",
    currency: "INR",
    isActive: true,
    expiresAt: "",
  });

  const toast = useToast();
  useAutoDismiss(error, $(() => { error.value = ""; }), 5000);

  useVisibleTask$(async () => {
    try {
      const data = (await getAdminGiftCards()) as GiftCardAdmin[];
      giftCards.value = data;
      error.value = "";
    } catch (err) {
      error.value =
        err instanceof Error && err.message
          ? err.message
          : "Could not load gift cards.";
    } finally {
      loading.value = false;
    }
  });

  const loadGiftCards = $(async () => {
    try {
      const data = (await getAdminGiftCards()) as GiftCardAdmin[];
      giftCards.value = data;
      error.value = "";
    } catch (err) {
      error.value =
        err instanceof Error && err.message
          ? err.message
          : "Could not load gift cards.";
    }
  });

  const handleCreate = $(async () => {
    submitting.value = true;
    try {
      const amount = Number(form.value.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Enter a valid amount.");
      }

      await createGiftCard({
        code: form.value.code || undefined,
        amount,
        currency: form.value.currency || undefined,
        isActive: form.value.isActive,
        expiresAt: form.value.expiresAt || undefined,
      });

      form.value = {
        code: "",
        amount: "",
        currency: "INR",
        isActive: true,
        expiresAt: "",
      };
      await toast.showToast({
        severity: "success",
        summary: "Gift card created",
        detail: "The new gift card has been generated.",
        life: 3000,
      });
      await loadGiftCards();
      error.value = "";
    } catch (err) {
      error.value =
        err instanceof Error && err.message
          ? err.message
          : "Could not create gift card.";
    } finally {
      submitting.value = false;
    }
  });

  const handleToggle = $(async (giftCard: GiftCardAdmin) => {
    try {
      await updateGiftCard(giftCard.id, { isActive: !giftCard.isActive });
      await loadGiftCards();
    } catch (err) {
      error.value =
        err instanceof Error && err.message
          ? err.message
          : "Could not update gift card.";
    }
  });

  const handleDelete = $(async (id: number) => {
    if (!window.confirm("Delete this gift card permanently?")) {
      return;
    }
    try {
      await removeGiftCard(id);
      await toast.showToast({
        severity: "info",
        summary: "Gift card deleted",
        detail: "The gift card has been removed.",
        life: 3000,
      });
      await loadGiftCards();
      error.value = "";
    } catch (err) {
      error.value =
        err instanceof Error && err.message
          ? err.message
          : "Could not delete gift card.";
    }
  });

  const total = giftCards.value.reduce((sum, card) => sum + card.initialAmount, 0);
  const remaining = giftCards.value.reduce(
    (sum, card) => sum + card.remainingAmount,
    0,
  );
  const active = giftCards.value.filter((card) => card.isActive).length;

  return (
    <div class="mx-auto max-w-6xl">
      <div class="mb-8">
        <p class="text-sm uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
          Store value
        </p>
        <h1 class="mt-3 font-serif text-3xl text-[var(--text-primary)] sm:text-4xl">
          Gift Cards
        </h1>
        <p class="mt-2 text-sm text-[var(--text-secondary)]">
          Issue and manage gift cards. Codes are generated or set manually.
        </p>
      </div>

      {error.value ? (
        <div
          class="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:text-red-300"
          role="alert"
        >
          {error.value}
        </div>
      ) : null}

      <section class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
          <p class="text-sm text-[var(--text-muted)]">Total issued</p>
          <p class="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            {formatCurrency(total)}
          </p>
        </div>
        <div class="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
          <p class="text-sm text-[var(--text-muted)]">Remaining balance</p>
          <p class="mt-2 text-2xl font-semibold text-emerald-700 dark:text-emerald-300">
            {formatCurrency(remaining)}
          </p>
        </div>
        <div class="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
          <p class="text-sm text-[var(--text-muted)]">Active cards</p>
          <p class="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            {active} / {giftCards.value.length}
          </p>
        </div>
        <div class="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
          <p class="text-sm text-[var(--text-muted)]">Total cards</p>
          <p class="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            {giftCards.value.length}
          </p>
        </div>
      </section>

      <section class="mb-10 rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 shadow-sm">
        <h2 class="font-serif text-2xl text-[var(--text-primary)]">
          Issue new gift card
        </h2>
        <p class="mt-1 text-sm text-[var(--text-secondary)]">
          Create a new gift card for a customer or campaign.
        </p>
        <form
          preventdefault:submit
          onSubmit$={handleCreate}
          class="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5"
        >
          <label class="text-sm font-medium text-[var(--text-secondary)]">
            Code
            <input
              value={form.value.code}
              onInput$={(_, el) =>
                (form.value = { ...form.value, code: el.value.toUpperCase() })
              }
              placeholder="Auto-generated if blank"
              class="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
            />
          </label>
          <label class="text-sm font-medium text-[var(--text-secondary)]">
            Amount
            <input
              type="number"
              min={1}
              value={form.value.amount}
              onInput$={(_, el) =>
                (form.value = { ...form.value, amount: el.value })
              }
              placeholder="1000"
              required
              class="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
            />
          </label>
          <label class="text-sm font-medium text-[var(--text-secondary)]">
            Currency
            <select
              value={form.value.currency}
              onChange$={(_, el) =>
                (form.value = { ...form.value, currency: el.value })
              }
              class="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
            >
              <option value="INR">INR</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <label class="text-sm font-medium text-[var(--text-secondary)]">
            Expires at
            <input
              type="date"
              value={form.value.expiresAt}
              onInput$={(_, el) =>
                (form.value = { ...form.value, expiresAt: el.value })
              }
              class="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
            />
          </label>
          <div class="flex items-end">
            <button
              type="submit"
              disabled={submitting.value}
              class="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting.value ? "Creating..." : "Create gift card"}
            </button>
          </div>
        </form>
      </section>

      <section>
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 class="font-serif text-2xl text-[var(--text-primary)]">
            All gift cards
          </h2>
          <button
            type="button"
            onClick$={loadGiftCards}
            class="rounded-full border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-primary)]"
          >
            Refresh
          </button>
        </div>
        <div class="space-y-4">
          {loading.value ? (
            <div class="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 text-center text-sm text-[var(--text-secondary)] shadow-sm">
              Loading gift cards...
            </div>
          ) : giftCards.value.length === 0 ? (
            <div class="rounded-[2rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] p-6 text-center text-sm text-[var(--text-secondary)] shadow-sm">
              No gift cards yet. Use the form above to create one.
            </div>
          ) : (
            giftCards.value.map((giftCard) => (
              <div
                key={giftCard.id}
                class="grid gap-4 rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm md:grid-cols-[1fr_auto]"
              >
                <div>
                  <div class="flex flex-wrap items-center gap-3">
                    <span class="rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-1 text-sm font-semibold tracking-[0.08em]">
                      {giftCard.code}
                    </span>
                    <span
                      class={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] ${
                        giftCard.isActive
                          ? "bg-emerald-50 text-emerald-700 dark:text-emerald-300"
                          : "bg-red-50 text-red-700 dark:text-red-300"
                      }`}
                    >
                      {giftCard.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div class="mt-3 flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                    <span>
                      Initial:{" "}
                      {formatCurrency(giftCard.initialAmount, giftCard.currency)}
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
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    onClick$={() => handleToggle(giftCard)}
                    class={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      giftCard.isActive
                        ? "border border-amber-200 text-amber-800 hover:bg-amber-50"
                        : "border border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                    }`}
                  >
                    {giftCard.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick$={() => handleDelete(giftCard.id)}
                    class="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
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
});

export default AdminGiftCardsContent;

export const head: DocumentHead = { title: "Admin · Gift Cards" };
