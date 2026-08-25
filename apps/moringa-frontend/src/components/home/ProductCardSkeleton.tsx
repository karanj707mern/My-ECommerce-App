import { component$ } from "@builder.io/qwik";
import { Skeleton } from "../Skeleton";

/**
 * Qwik port of legacy `components/ProductCardSkeleton.tsx`.
 * Mirrors the ProductCard geometry so grid swaps don't jump.
 */
export const ProductCardSkeleton = component$(() => {
  return (
    <div class="card overflow-hidden rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm">
      <Skeleton class="h-60 w-full" />
      <div class="p-6">
        <Skeleton variant="text" width="40%" height="0.875rem" />
        <Skeleton variant="text" width="90%" height="1.5rem" class="mt-2" />
        <Skeleton variant="text" width="100%" height="2.5rem" class="mt-2" />
        <div class="mt-auto flex items-center gap-2 pt-4">
          <Skeleton variant="rounded" class="h-7 w-20 shrink-0" />
          <Skeleton variant="rounded" class="ml-auto h-9 w-9 shrink-0" />
          <Skeleton variant="rounded" class="h-10 flex-1" />
        </div>
      </div>
    </div>
  );
});
