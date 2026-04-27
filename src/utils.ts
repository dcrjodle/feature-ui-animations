import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const REF_DATA_ATTR = 'data-fua-ref';
export const HOVER_DATA_ATTR = 'data-fua-hover';
export const CURSOR_DATA_ATTR = 'data-fua-cursor';

export const refSelector = (name: string): string =>
  `[${REF_DATA_ATTR}="${name}"]`;
export const cursorSelector: string = `[${CURSOR_DATA_ATTR}]`;
