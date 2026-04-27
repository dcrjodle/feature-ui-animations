'use client';

import { motion } from 'motion/react';

import { createRef, type Anchor, type FractionalAnchor } from './ref';
import { cn, CURSOR_REF_NAME } from './utils';

/**
 * Built-in ref for the animation cursor. `<AnimationCursor>` binds itself to
 * this ref automatically — scripts can read/write the cursor like any other
 * element:
 *
 *     await ctx.snap(cursorRef, { x: 40, y: 40, opacity: 0 });
 *     await ctx.animate(cursorRef, { opacity: 0 }, { duration: 0.3 });
 */
export const cursorRef = createRef(CURSOR_REF_NAME);

interface AnimationCursorProps {
  className?: string;
}

export function AnimationCursor({ className }: AnimationCursorProps) {
  return (
    <motion.svg
      {...cursorRef.bind()}
      initial={{ opacity: 0, x: 0, y: 0 }}
      viewBox="0 0 20 20"
      className={cn(
        'text-foreground pointer-events-none absolute top-0 left-0 z-30 h-5 w-5 drop-shadow-sm',
        className,
      )}
      aria-hidden
    >
      <path
        d="M3 2L3 16L7 12.5L9.5 18L12 17L9.5 11.5L15 11.5L3 2Z"
        fill="currentColor"
        stroke="var(--background)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}

export const CURSOR_TIP_X = 3;
export const CURSOR_TIP_Y = 2;

/**
 * Returns a function that maps a target element + anchor to a cursor (x, y)
 * position relative to the container.
 */
export function createCursorTarget(container: HTMLElement) {
  return (
    el: Element,
    anchor: Anchor | FractionalAnchor = 'center',
  ): { x: number; y: number } => {
    const containerRect = container.getBoundingClientRect();
    const targetRect = el.getBoundingClientRect();

    const fractional: FractionalAnchor =
      typeof anchor === 'string' ? ANCHOR_TO_FRACTION[anchor] : anchor;

    const targetX =
      targetRect.left + targetRect.width * fractional.x - containerRect.left;
    const targetY =
      targetRect.top + targetRect.height * fractional.y - containerRect.top;

    return {
      x: targetX - CURSOR_TIP_X,
      y: targetY - CURSOR_TIP_Y,
    };
  };
}

const ANCHOR_TO_FRACTION: Record<Anchor, FractionalAnchor> = {
  center: { x: 0.5, y: 0.5 },
  topLeft: { x: 0, y: 0 },
  topRight: { x: 1, y: 0 },
  bottomLeft: { x: 0, y: 1 },
  bottomRight: { x: 1, y: 1 },
};
