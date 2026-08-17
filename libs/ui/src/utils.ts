import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility to merge Tailwind CSS classes with clsx
 * 
 * This is a wrapper around tailwind-merge + clsx.
 * If tailwind-merge becomes unmaintained, only this file needs updating.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
