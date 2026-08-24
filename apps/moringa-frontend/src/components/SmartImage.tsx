import { component$ } from "@builder.io/qwik";

export const IMAGE_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' fill='%23f5f5f4'%3E%3Crect width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23a8a29e' font-family='sans-serif' font-size='16'%3EImage unavailable%3C/text%3E%3C/svg%3E";

interface SmartImageProps {
  src: string;
  alt: string;
  class?: string;
  width?: number;
  height?: number;
}

/**
 * Lazy image with a graceful SVG fallback when the source fails to load.
 * Replaces legacy `next/image` + `onError` usage across ported pages.
 */
export const SmartImage = component$<SmartImageProps>((props) => (
  <img
    src={props.src}
    alt={props.alt}
    width={props.width ?? 400}
    height={props.height ?? 300}
    loading="lazy"
    decoding="async"
    class={props.class}
    onError$={(_, el) => {
      if (!el.src.startsWith("data:image/svg+xml")) {
        el.src = IMAGE_FALLBACK;
      }
    }}
  />
));
