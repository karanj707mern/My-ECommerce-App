"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { Suspense } from "react";
import { OrdersPageInner } from "../components/OrdersPageInner";

function OrdersPageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <p className="text-sm text-[var(--text-muted)]">Loading orders...</p>
    </div>
  );
}

export default function OrdersPage(_props: { params: { slug?: string[] } }) {
  return (
    <Suspense fallback={<OrdersPageFallback />}>
      <OrdersPageInner />
    </Suspense>
  );
}
