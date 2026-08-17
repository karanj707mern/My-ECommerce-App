"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionStage, setTransitionStage] = useState<
    "enter" | "exit" | "idle"
  >("idle");

  useEffect(() => {
    let enterTimer: ReturnType<typeof setTimeout> | null = null;

    setTransitionStage("exit");
    const exitTimer = setTimeout(() => {
      setDisplayChildren(children);
      setTransitionStage("enter");
      enterTimer = setTimeout(() => setTransitionStage("idle"), 300);
    }, 150);

    return () => {
      clearTimeout(exitTimer);
      if (enterTimer !== null) {
        clearTimeout(enterTimer);
      }
    };
  }, [pathname, children]);

  const className =
    transitionStage === "enter"
      ? "page-transition"
      : transitionStage === "exit"
        ? "opacity-0 translate-y-2"
        : "page-transition";

  return <main className={className}>{displayChildren}</main>;
}
