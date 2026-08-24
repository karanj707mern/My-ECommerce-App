import { $, component$, useSignal } from "@builder.io/qwik";
import { type DocumentHead } from "@builder.io/qwik-city";
import {
  getGiftCardBalance,
  redeemGiftCard,
  type GiftCardBalance,
} from "../../../lib/api/gift-card";
import { useToast } from "../../../hooks/useToast";
import { useAutoDismiss } from "../../../hooks/useAutoDismiss";
import { buildHead } from "../../../lib/seo";

function formatCurrency(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Qwik port of the legacy gift-cards page.
 * Balance check + redeem flows with auto-dismissing inline error banner.
 */
export default component$(() => {
  const code = useSignal("");
  const submitting = useSignal(false);
  const balance = useSignal<GiftCardBalance | null>(null);
  const error = useSignal("");

  const toast = useToast();
  useAutoDismiss(error, $(() => { error.value = ""; }), 5000);

  const handleCheckBalance = $(async () => {
    if (!code.value.trim()) return;
    submitting.value = true;
    try {
      balance.value = await getGiftCardBalance(code.value.trim());
      error.value = "";
    } catch (err) {
      balance.value = null;
      error.value =
        err instanceof Error && err.message
          ? err.message
          : "Could not load gift card balance.";
    } finally {
      submitting.value = false;
    }
  });

  const handleRedeem = $(async () => {
    if (!code.value.trim()) return;
    submitting.value = true;
    try {
      balance.value = await redeemGiftCard(code.value.trim());
      code.value = "";
      await toast.showToast({
        severity: "success",
        summary: "Gift card redeemed",
        detail: "The gift card has been applied to your account.",
        life: 3000,
      });
      error.value = "";
    } catch (err) {
      error.value =
        err instanceof Error && err.message
          ? err.message
          : "Could not redeem gift card.";
    } finally {
      submitting.value = false;
    }
  });

  const canRedeem =
    balance.value && balance.value.isActive && balance.value.remainingAmount > 0;

  return (
    <div class="min-h-screen bg-[var(--bg-primary)] pb-24 text-[var(--text-primary)] theme-transition">
      <main>
        <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">
          <div class="mx-auto max-w-2xl">
            <div class="mb-8">
              <p class="text-sm uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                Store credit
              </p>
              <h1 class="mt-3 font-serif text-3xl text-[var(--text-primary)] sm:text-4xl">
                Gift Cards
              </h1>
              <p class="mt-2 text-sm text-[var(--text-secondary)]">
                Enter your gift card code to check its balance or redeem it.
              </p>
            </div>

            {error.value ? (
              <div
                class="mb-6 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]"
                role="alert"
              >
                {error.value}
              </div>
            ) : null}

            <form
              preventdefault:submit
              onSubmit$={handleCheckBalance}
              class="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 shadow-sm"
            >
              <label class="text-sm font-medium text-[var(--text-secondary)]">
                Gift card code
                <input
                  value={code.value}
                  onInput$={(_, el) => (code.value = el.value.toUpperCase())}
                  placeholder="ENTER YOUR CODE"
                  required
                  class="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm font-semibold tracking-[0.08em] text-[var(--text-primary)] outline-none transition focus:border-emerald-500 placeholder:text-center placeholder:text-sm placeholder:font-normal placeholder:text-[var(--text-muted)]"
                />
              </label>
              <div class="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <button
                  type="submit"
                  disabled={submitting.value}
                  class="btn-primary whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting.value ? "Checking..." : "Check balance"}
                </button>
                {canRedeem ? (
                  <button
                    type="button"
                    onClick$={handleRedeem}
                    disabled={submitting.value}
                    class="whitespace-nowrap rounded-[2rem] border border-[var(--success-border)] px-4 py-2.5 text-sm font-semibold text-[var(--success-text)] transition hover:bg-[var(--success-bg)] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {submitting.value ? "Redeeming..." : "Redeem now"}
                  </button>
                ) : null}
              </div>
            </form>

            {balance.value ? (
              <div class="mt-8 rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 shadow-sm">
                <div class="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p class="text-sm text-[var(--text-muted)]">Gift card</p>
                    <p class="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                      {balance.value.code}
                    </p>
                  </div>
                  <span
                    class={`rounded-full px-3 py-1 text-sm font-semibold ${
                      balance.value.isActive
                        ? "bg-emerald-50 text-emerald-700 dark:text-emerald-300"
                        : "bg-[var(--danger-bg)] text-[var(--danger-text)]"
                    }`}
                  >
                    {balance.value.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div class="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p class="text-sm text-[var(--text-muted)]">Initial amount</p>
                    <p class="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                      {formatCurrency(
                        balance.value.initialAmount,
                        balance.value.currency,
                      )}
                    </p>
                  </div>
                  <div>
                    <p class="text-sm text-[var(--text-muted)]">
                      Remaining balance
                    </p>
                    <p class="mt-1 text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                      {formatCurrency(
                        balance.value.remainingAmount,
                        balance.value.currency,
                      )}
                    </p>
                  </div>
                  <div>
                    <p class="text-sm text-[var(--text-muted)]">Currency</p>
                    <p class="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                      {balance.value.currency}
                    </p>
                  </div>
                  <div>
                    <p class="text-sm text-[var(--text-muted)]">Redeemed at</p>
                    <p class="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                      {balance.value.redeemedAt
                        ? new Date(balance.value.redeemedAt).toLocaleString()
                        : "Not redeemed"}
                    </p>
                  </div>
                  <div>
                    <p class="text-sm text-[var(--text-muted)]">Expires at</p>
                    <p class="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                      {balance.value.expiresAt
                        ? new Date(balance.value.expiresAt).toLocaleDateString()
                        : "No expiry"}
                    </p>
                  </div>
                  <div>
                    <p class="text-sm text-[var(--text-muted)]">Last used</p>
                    <p class="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                      {balance.value.lastUsedAt
                        ? new Date(balance.value.lastUsedAt).toLocaleString()
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
});

export const head: DocumentHead = () =>
  buildHead({
    title: "Gift Cards",
    description:
      "Check the balance of your Moringa Store Online gift card or redeem store credit.",
    path: "/gift-cards",
  });
