import { Suspense } from "react";
import { CartPageShell } from "./components/CartPageShell";
import { CartPageInner } from "./components/CartPageInner";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function CartPageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <p className="text-sm text-[var(--text-muted)]">Loading cart...</p>
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={<CartPageFallback />}>
      <CartPageShell>
        <CartPageInner />
      </CartPageShell>
    </Suspense>
  );
}
