"use client";

export interface GuestPromptProps {
  onSignIn: () => void;
}

export function GuestPrompt({ onSignIn }: GuestPromptProps) {
  return (
    <div className="mb-8 rounded-[2rem] border border-[var(--success-border)] bg-[var(--success-bg)] p-6 shadow-sm card">
      <div className="space-y-2 text-center">
        <p className="text-base font-medium text-[var(--success-text)]">
          You are viewing your cart as a guest.
        </p>
        <p className="text-sm text-[var(--success-text)]">
          Sign in to preserve your cart, unlock free shipping offers, save
          addresses, and checkout in one tap.
        </p>
      </div>
      <div className="mt-4 text-center">
        <button type="button" onClick={onSignIn} className="btn-primary">
          Sign in to preserve cart
        </button>
      </div>
    </div>
  );
}
