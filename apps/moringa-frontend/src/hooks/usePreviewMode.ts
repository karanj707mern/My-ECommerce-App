import { useSignal } from "@builder.io/qwik";
import { useVisibleTask$, $ } from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";

const STORAGE_KEY = "adminPreviewMode";

function readStorage(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

function writeStorage(value: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, value ? "true" : "false");
}

/**
 * Qwik port of the legacy `usePreviewMode` hook.
 *
 * The URL `?preview=true|false` query parameter is the source of truth on
 * mount; the flag persists in localStorage so admin preview survives
 * client-side navigations.
 */
export function usePreviewMode() {
  const nav = useNavigate();
  const previewMode = useSignal(readStorage());

  useVisibleTask$(() => {
    const urlPreview =
      new URLSearchParams(window.location.search).get("preview") === "true";

    if (urlPreview !== previewMode.value) {
      writeStorage(urlPreview);
      previewMode.value = urlPreview;
    }
  });

  const enablePreview = $(async (href: string) => {
    writeStorage(true);
    previewMode.value = true;
    await nav(href);
  });

  const disablePreview = $(async (href: string) => {
    writeStorage(false);
    previewMode.value = false;
    await nav(href);
  });

  return {
    previewMode,
    enablePreview,
    disablePreview,
  };
}
