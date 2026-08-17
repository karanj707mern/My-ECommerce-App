"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProfile } from "@/lib/api/auth";
import {
  clearToken,
  setCurrentUser,
  useAuthChecked,
  useCurrentUser,
} from "@/lib/storage";
import { useToast } from "@/hooks/useToast";

function AdminLoadingState() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-stone-500">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-emerald-600" />
        <p className="text-sm">Verifying admin access…</p>
      </div>
    </div>
  );
}

function AdminAccessDenied() {
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-700 dark:text-red-300">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h1 className="font-serif text-2xl text-[var(--text-primary)]">
          Access Denied
        </h1>
        <p className="max-w-md text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
          You need admin privileges to access this area. If you believe this is
          an error, please contact support.
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="btn-primary mt-4"
        >
          Back to Store
        </button>
      </div>
    </div>
  );
}

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();
  const currentUser = useCurrentUser() as Record<string, unknown> | null;
  const authChecked = useAuthChecked();
  const [status, setStatus] = useState<"loading" | "ok" | "denied">("loading");

  const redirectToAuth = useCallback(
    (message?: string) => {
      clearToken();
      if (message) {
        toast.showToast({
          severity: "info",
          summary: "Session expired",
          detail: message,
          life: 4000,
        });
      }
      const target = "/auth?from=" + encodeURIComponent("/admin");
      if (typeof window !== "undefined") {
        window.location.href = target;
      } else {
        router.push(target);
      }
    },
    [router, toast],
  );

  useEffect(() => {
    if (!authChecked) {
      return;
    }

    if (!currentUser?.id) {
      redirectToAuth("Sign in as admin to access the dashboard.");
      return;
    }

    let cancelled = false;

    getProfile()
      .then((data) => {
        if (cancelled) {
          return;
        }
        const profileData = data as { user: Record<string, unknown> };
        setCurrentUser(profileData.user);

        if (profileData.user?.role !== "ADMIN") {
          setStatus("denied");
          return;
        }

        setStatus("ok");
      })
      .catch(() => {
        if (!cancelled) {
          redirectToAuth();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authChecked, currentUser?.id, redirectToAuth, router, toast]);

  if (status === "loading") {
    return <AdminLoadingState />;
  }

  if (status === "denied") {
    return <AdminAccessDenied />;
  }

  return <>{children}</>;
}
