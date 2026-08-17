"use client";

import { useMemo } from "react";
import { ToastContext } from "./ToastContext";
import { toast, Toaster } from "sonner";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const showToast = useMemo(
    () =>
      ({
        severity = "info",
        summary = "",
        detail = "",
        life = 4000,
      }: {
        severity?: string;
        summary?: string;
        detail?: string;
        life?: number;
      } = {}) => {
        if (process.env.NODE_ENV === "development") {
          console.log("[Toast] showToast called", {
            severity,
            summary,
            detail,
            life,
          });
        }
        const message = summary
          ? detail
            ? `${summary}: ${detail}`
            : summary
          : detail;
        const timeout = Number.isFinite(life) ? life : 4000;

        if (severity === "success") {
          toast.success(message || "Saved.", { duration: timeout });
          return;
        }

        if (severity === "error") {
          toast.error(message || "Something went wrong.", {
            duration: timeout,
          });
          return;
        }

        if (severity === "warning") {
          toast.warning(message || "Please check.", { duration: timeout });
          return;
        }

        toast(message || "Notification.", { duration: timeout });
      },
    [],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        duration={4000}
        theme="light"
      />
    </ToastContext.Provider>
  );
}
