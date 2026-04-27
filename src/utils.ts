import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const REF_DATA_ATTR = 'data-fua-ref';
export const REF_KEY_ATTR = 'data-fua-key';
export const HOVER_DATA_ATTR = 'data-fua-hover';

export const refSelector = (name: string, key?: string): string =>
  key === undefined
    ? `[${REF_DATA_ATTR}="${name}"]`
    : `[${REF_DATA_ATTR}="${name}"][${REF_KEY_ATTR}="${escapeKey(key)}"]`;

const escapeKey = (key: string) => key.replace(/"/g, '\\"');

/** Internal name reserved for the built-in cursor ref. */
export const CURSOR_REF_NAME = 'fua:cursor';
export const cursorSelector: string = refSelector(CURSOR_REF_NAME);
