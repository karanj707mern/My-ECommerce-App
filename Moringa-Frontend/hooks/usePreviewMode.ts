"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const STORAGE_KEY = "adminPreviewMode";

function readStorage(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

function writeStorage(value: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, value ? "true" : "false");
}

export function usePreviewMode() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [previewMode, setPreviewMode] = useState(() => readStorage());

  useEffect(() => {
    const urlPreview = searchParams.get("preview") === "true";
    const storagePreview = readStorage();

    if (urlPreview !== storagePreview) {
      writeStorage(urlPreview);
      setPreviewMode(urlPreview);
    }
  }, [searchParams]);

  const enablePreview = useCallback(
    (href: string) => {
      writeStorage(true);
      setPreviewMode(true);
      router.push(href);
    },
    [router],
  );

  const disablePreview = useCallback(
    (href: string) => {
      writeStorage(false);
      setPreviewMode(false);
      router.push(href);
    },
    [router],
  );

  return {
    previewMode,
    enablePreview,
    disablePreview,
  };
}
