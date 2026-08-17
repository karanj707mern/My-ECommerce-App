import { component$, type PropsOf } from "@builder.io/qwik";
import { cn } from "../utils";

/**
 * Button component - wraps Qwik's native button with consistent styling
 * 
 * If we need to replace the underlying UI library, only this file changes.
 * All consuming code uses <AppButton> instead of direct library imports.
 */
export const AppButton = component$<PropsOf<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  class?: string;
}>((props) => {
  const { variant = "primary", size = "md", class: className, ...rest } = props;

  const variants = {
    primary: "bg-emerald-700 text-white hover:bg-emerald-800",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
    ghost: "hover:bg-gray-100 text-gray-700",
    destructive: "bg-red-600 text-white hover:bg-red-700",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm rounded",
    md: "px-4 py-2 text-base rounded-md",
    lg: "px-6 py-3 text-lg rounded-lg",
  };

  return (
    <button
      class={cn(
        "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...rest}
    />
  );
});
