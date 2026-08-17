"use client";

import { createContext } from "react";

export const ToastContext = createContext<{
  showToast: (opts: {
    severity?: string;
    summary?: string;
    detail?: string;
    life?: number;
  }) => void;
} | null>(null);
