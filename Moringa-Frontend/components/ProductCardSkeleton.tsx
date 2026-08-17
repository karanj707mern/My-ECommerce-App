"use client";

import Skeleton from "./Skeleton";

export default function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm card">
      <Skeleton className="h-60 w-full" />
      <div className="p-6">
        <Skeleton variant="text" width="40%" height="0.875rem" />
        <Skeleton variant="text" width="90%" height="1.5rem" className="mt-2" />
        <Skeleton
          variant="text"
          width="100%"
          height="2.5rem"
          className="mt-2"
        />
        <div className="mt-auto flex items-center gap-2 pt-4">
          <Skeleton variant="rounded" className="h-7 w-20 shrink-0" />
          <Skeleton variant="rounded" className="ml-auto h-9 w-9 shrink-0" />
          <Skeleton variant="rounded" className="flex-1 h-10" />
        </div>
      </div>
    </div>
  );
}
