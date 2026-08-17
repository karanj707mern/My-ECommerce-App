"use client";

import { useContext } from "react";
import { ToastContext } from "@/components/ToastContext";

export function useToast(): {
  showToast: (opts: {
    severity?: string;
    summary?: string;
    detail?: string;
    life?: number;
  }) => void;
} {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
