import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names, resolving conflicting Tailwind utilities so the last one wins.
 * Accepts the full `clsx` input shape (strings, arrays, conditional objects, falsy values).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
