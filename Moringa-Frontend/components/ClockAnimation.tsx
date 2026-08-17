"use client";

import { useEffect, useState } from "react";

interface ClockAnimationProps {
  className?: string;
}

export default function ClockAnimation({ className }: ClockAnimationProps) {
  const [rotation, setRotation] = useState(0);
  const [timeString, setTimeString] = useState<string | null>(null);

  useEffect(() => {
    const startTime = Date.now();
    let timer: number | null = null;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const seconds = elapsed / 1000;
      const fullDaySeconds = 24 * 60 * 60;
      const normalized = seconds % fullDaySeconds;
      const degrees = (normalized / fullDaySeconds) * 360;
      setRotation(degrees);

      const now = new Date();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const secondsNow = now.getSeconds().toString().padStart(2, "0");
      setTimeString(`${hours}:${minutes}:${secondsNow}`);
    };

    const startTimer = () => {
      if (timer !== null) {
        window.clearInterval(timer);
      }
      tick();
      timer = window.setInterval(tick, 1000);
    };

    const stopTimer = () => {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    startTimer();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopTimer();
      } else {
        startTimer();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <span
      className={`inline-flex items-center gap-3 transition-all duration-500 ease-in-out ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-8 w-8"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span className="text-2xl font-semibold tracking-wide">
        {timeString ?? "--:--:--"}
      </span>
    </span>
  );
}
