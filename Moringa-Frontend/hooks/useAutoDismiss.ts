"use client";

import { useEffect, useRef } from "react";

function useAutoDismiss(
  value: unknown,
  onDismiss: () => void,
  delay = 4000,
): void {
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (!value) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onDismissRef.current();
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [value, delay]);
}

export default useAutoDismiss;
