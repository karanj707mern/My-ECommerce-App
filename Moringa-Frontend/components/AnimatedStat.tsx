"use client";

import { useEffect, useMemo, useState } from "react";

interface AnimatedStatProps {
  values?: string[];
  interval?: number;
  className?: string;
  countTo?: number;
  countFrom?: number;
  duration?: number;
}

export default function AnimatedStat({
  values,
  interval = 2000,
  className,
  countTo,
  countFrom = 1,
  duration = 1200,
}: AnimatedStatProps) {
  const [index, setIndex] = useState(0);
  const [displayNumber, setDisplayNumber] = useState(countFrom ?? 1);

  useEffect(() => {
    if (!values || values.length <= 1) return;

    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % values.length);
    }, interval);

    return () => window.clearInterval(timer);
  }, [values, interval]);

  useEffect(() => {
    if (countTo == null) return;

    const startTime = performance.now();
    const startValue = countFrom;
    const endValue = countTo;

    let frame: number;
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (endValue - startValue) * eased);
      setDisplayNumber(current);

      if (progress < 1) {
        frame = window.requestAnimationFrame(animate);
      }
    };

    frame = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(frame);
  }, [countTo, countFrom, duration]);

  const content = useMemo(() => {
    if (countTo != null) {
      return `${displayNumber}+`;
    }
    if (values && values.length > 0) {
      return values[index];
    }
    return null;
  }, [countTo, displayNumber, index, values]);

  if (!content) return null;

  return (
    <span
      className={`inline-block transition-all duration-500 ease-in-out ${className}`}
    >
      {content}
    </span>
  );
}
