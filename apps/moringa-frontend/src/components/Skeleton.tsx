import { component$ } from "@builder.io/qwik";

interface SkeletonProps {
  class?: string;
  variant?: "text" | "rounded" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

/**
 * Qwik port of legacy `components/Skeleton.tsx`.
 * Renders a pulsing placeholder block (`skeleton` utility lives in global.css).
 */
export const Skeleton = component$<SkeletonProps>((props) => {
  const variantClasses = {
    text: "rounded",
    rounded: "rounded",
    circular: "rounded-full",
    rectangular: "rounded-lg",
  } as const;

  return (
    <div
      class={`skeleton ${variantClasses[props.variant ?? "rectangular"]} ${
        props.class ?? ""
      }`}
      style={{
        width: props.width ?? "100%",
        height: props.height ?? (props.variant === "text" ? "1rem" : "100%"),
      }}
      aria-hidden="true"
    />
  );
});
