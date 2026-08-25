import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

interface ClockAnimationProps {
  class?: string;
}

/**
 * Qwik port of legacy `components/ClockAnimation.tsx`.
 *
 * A live clock whose SVG hands sweep once per 24h (symbolic "always open"
 * storefront). Ticks every second and pauses while the tab is hidden.
 */
export const ClockAnimation = component$<ClockAnimationProps>((props) => {
  const rotation = useSignal(0);
  const timeString = useSignal<string | null>(null);

  useVisibleTask$(({ cleanup }) => {
    const startTime = Date.now();
    let timer: number | null = null;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const fullDaySeconds = 24 * 60 * 60;
      const normalized = (elapsed / 1000) % fullDaySeconds;
      rotation.value = (normalized / fullDaySeconds) * 360;

      const now = new Date();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const secondsNow = now.getSeconds().toString().padStart(2, "0");
      timeString.value = `${hours}:${minutes}:${secondsNow}`;
    };

    const startTimer = () => {
      if (timer !== null) window.clearInterval(timer);
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
      if (document.hidden) stopTimer();
      else startTimer();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    cleanup(() => {
      stopTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    });
  });

  return (
    <span
      class={`inline-flex items-center gap-3 transition-all duration-500 ease-in-out ${props.class ?? ""}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-8 w-8"
        style={{ transform: `rotate(${rotation.value}deg)` }}
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span class="text-2xl font-semibold tracking-wide">
        {timeString.value ?? "--:--:--"}
      </span>
    </span>
  );
});
