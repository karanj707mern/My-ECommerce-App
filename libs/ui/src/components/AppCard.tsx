import { component$, type PropsOf } from "@builder.io/qwik";
import { cn } from "../utils";

/**
 * Card component - wraps native HTML elements with consistent styling
 * 
 * This is a local wrapper. If we switch to a UI library later,
 * only this file needs to change.
 */
export const AppCard = component$<PropsOf<"div"> & {
  class?: string;
}>((props) => {
  const { class: className, ...rest } = props;

  return (
    <div
      class={cn(
        "rounded-lg border border-gray-200 bg-white shadow-sm",
        className
      )}
      {...rest}
    />
  );
});

export const AppCardHeader = component$<PropsOf<"div"> & { class?: string }>(
  (props) => {
    const { class: className, ...rest } = props;
    return (
      <div
        class={cn("p-6 border-b border-gray-100", className)}
        {...rest}
      />
    );
  }
);

export const AppCardContent = component$<PropsOf<"div"> & { class?: string }>(
  (props) => {
    const { class: className, ...rest } = props;
    return (
      <div class={cn("p-6", className)} {...rest} />
    );
  }
);

export const AppCardFooter = component$<PropsOf<"div"> & { class?: string }>(
  (props) => {
    const { class: className, ...rest } = props;
    return (
      <div
        class={cn("p-6 border-t border-gray-100", className)}
        {...rest}
      />
    );
  }
);
