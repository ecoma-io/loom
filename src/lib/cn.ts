import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge conditional class names, resolving Tailwind conflicts so the last
 * utility in a group wins. Every component routes its `class` through this,
 * which is what lets a consumer override any utility from the outside without
 * reaching for `!important`.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
