import { component$, type PropFunction } from "@builder.io/qwik";

export interface GuestPromptProps {
  onSignIn$: PropFunction<() => void>;
}

/** Banner nudging guests to sign in before checkout. */
export const GuestPrompt = component$<GuestPromptProps>(({ onSignIn$ }) => {
  return (
    <div class="card mb-8 rounded-[2rem] border border-[var(--success-border)] bg-[var(--success-bg)] p-6 shadow-sm">
      <div class="space-y-2 text-center">
        <p class="text-base font-medium text-[var(--success-text)]">
          You are viewing your cart as a guest.
        </p>
        <p class="text-sm text-[var(--success-text)]">
          Sign in to preserve your cart, unlock free shipping offers, save
          addresses, and checkout in one tap.
        </p>
      </div>
      <div class="mt-4 text-center">
        <button type="button" onClick$={onSignIn$} class="btn-primary">
          Sign in to preserve cart
        </button>
      </div>
    </div>
  );
});

export default GuestPrompt;
