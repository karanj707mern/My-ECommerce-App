import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

interface AnimatedStatProps {
  values?: string[];
  interval?: number;
  class?: string;
  countTo?: number;
  countFrom?: number;
  duration?: number;
}

/**
 * Qwik port of legacy `components/AnimatedStat.tsx`.
 *
 * Two modes:
 * - `countTo`: eases a number up from `countFrom` with a cubic ease-out and
 *   renders it with a trailing "+".
 * - `values`: cycles through the provided strings every `interval` ms.
 */
export const AnimatedStat = component$<AnimatedStatProps>((props) => {
  const index = useSignal(0);
  const displayNumber = useSignal(props.countFrom ?? 1);

  // Cycle through `values` when provided.
  useVisibleTask$(({ cleanup }) => {
    const values = props.values;
    if (!values || values.length <= 1) return;
    const timer = window.setInterval(() => {
      index.value = (index.value + 1) % values.length;
    }, props.interval ?? 2000);
    cleanup(() => window.clearInterval(timer));
  });

  // Ease towards `countTo` with requestAnimationFrame.
  useVisibleTask$(({ track }) => {
    const countTo = track(() => props.countTo);
    if (countTo == null) return;
    const countFrom = props.countFrom ?? 1;
    const duration = props.duration ?? 1200;

    const startTime = performance.now();
    let frame = 0;
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      displayNumber.value = Math.round(
        countFrom + (countTo - countFrom) * eased,
      );
      if (progress < 1) {
        frame = window.requestAnimationFrame(animate);
      }
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  });

  let content: string | null = null;
  if (props.countTo != null) {
    content = `${displayNumber.value}+`;
  } else if (props.values && props.values.length > 0) {
    content = props.values[index.value];
  }

  if (!content) return null;

  return (
    <span
      class={`inline-block transition-all duration-500 ease-in-out ${props.class ?? ""}`}
    >
      {content}
    </span>
  );
});
