'use client';

import { useEffect, useRef } from 'react';

import { type AnimationScope, useAnimate } from 'motion/react';

import { createCursorTarget } from './animation-cursor';
import { useHandleRegistry } from './handles';
import {
  isRef,
  isRefPosition,
  toPosition,
  type RefOrPosition,
  type ScriptRef,
} from './ref';
import { cursorSelector } from './utils';

const DEFAULT_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

/**
 * Public-facing keyframe values. Mirrors motion's `DOMKeyframesDefinition`
 * (CSS properties + transform shortcuts like `x`, `y`, `scale`, `rotate`,
 * plus opacity, color, etc.) without depending on motion-dom for the type.
 */
export type AnimateValues = Record<string, unknown>;

/**
 * Public-facing animation options. Mirrors motion's `AnimationOptions`
 * (`duration`, `ease`, `delay`, etc.).
 */
export type AnimateOptions = Record<string, unknown>;

type LooseAnimate = (
  target: Element | string,
  values: AnimateValues,
  options?: AnimateOptions,
) => Promise<unknown>;

interface MoveOpts {
  duration?: number;
  ease?: [number, number, number, number] | string;
}

interface ClickOpts extends MoveOpts {
  pulse?: boolean;
  pulseScale?: number;
  /** Fire a registered handle on a ref as part of the click sequence. */
  invoke?: { ref: ScriptRef; handle: string; args?: unknown[] };
}

interface HoverSequenceItem {
  ref: RefOrPosition;
  onHover?: () => void;
  wait?: number;
  duration?: number;
}

interface HoverSequenceOpts {
  perHoverWait?: number;
  duration?: number;
}

interface TypeIntoOpts {
  perChar?: number;
}

interface StreamLinesOpts {
  perChar?: number;
  perLineWait?: number;
}

export interface ScriptContext {
  cancelled: () => boolean;
  container: HTMLElement;
  wait: (ms: number) => Promise<void>;

  /** Instantly set values on a ref's element (no transition). */
  snap: (ref: ScriptRef, values: AnimateValues) => Promise<void>;

  /** Animate values on a ref's element. */
  animate: (
    ref: ScriptRef,
    values: AnimateValues,
    options?: AnimateOptions,
  ) => Promise<void>;

  hideCursor: (opts?: { duration?: number }) => Promise<void>;
  showCursor: (opts?: { duration?: number }) => Promise<void>;

  /** Move the cursor to the position of a ref (defaults to center). */
  moveTo: (target: RefOrPosition, opts?: MoveOpts) => Promise<void>;

  /** Move cursor to ref, optionally pulse-scale the element, optionally invoke a handle. */
  click: (target: RefOrPosition, opts?: ClickOpts) => Promise<void>;

  /** Sweep the cursor through a list of refs/positions. */
  hoverSequence: (
    items: Array<RefOrPosition | HoverSequenceItem>,
    opts?: HoverSequenceOpts,
  ) => Promise<void>;

  /** Invoke a registered handle on a ref's component. */
  invoke: (ref: ScriptRef, handle: string, ...args: unknown[]) => Promise<unknown>;

  /** Sugar: `await ctx.call(dropdown).open()`. */
  call: <H extends string>(ref: ScriptRef<H>) => Record<H, (...args: unknown[]) => Promise<unknown>>;

  typeInto: (
    text: string,
    setter: (partial: string) => void,
    opts?: TypeIntoOpts,
  ) => Promise<void>;

  streamLines: (
    lines: string[],
    setter: (partial: string) => void,
    opts?: StreamLinesOpts,
  ) => Promise<void>;
}

export type Script = (ctx: ScriptContext) => Promise<void>;

export interface UseScriptedDemoOptions {
  /** When false, the script does not run. Useful for pausing demos. */
  enabled?: boolean;
}

export function useScriptedDemo(
  script: Script,
  options: UseScriptedDemoOptions = {},
): { scope: AnimationScope<HTMLDivElement> } {
  const { enabled = true } = options;
  const [scope, rawAnimate] = useAnimate<HTMLDivElement>();
  const animate = rawAnimate as unknown as LooseAnimate;
  const scriptRef = useRef(script);
  scriptRef.current = script;
  const registry = useHandleRegistry();
  const registryRef = useRef(registry);
  registryRef.current = registry;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const container = scope.current;
    if (!container) return;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const id = setTimeout(resolve, ms);
        if (cancelled) clearTimeout(id);
      });

    const cursorTarget = createCursorTarget(container);

    const resolveElement = (ref: ScriptRef): Element | null =>
      container.querySelector(ref.selector);

    const findCursor = (): Element | null =>
      container.querySelector(cursorSelector);

    const snap: ScriptContext['snap'] = (ref, values) =>
      animate(ref.selector, values, { duration: 0 }).then(() => undefined);

    const animateValues: ScriptContext['animate'] = (ref, values, opts) =>
      animate(ref.selector, values, opts).then(() => undefined);

    const hideCursor: ScriptContext['hideCursor'] = async ({
      duration = 0,
    } = {}) => {
      const cursor = findCursor();
      if (!cursor) return;
      await animate(cursor, { opacity: 0 }, { duration });
    };

    const showCursor: ScriptContext['showCursor'] = async ({
      duration = 0.2,
    } = {}) => {
      const cursor = findCursor();
      if (!cursor) return;
      await animate(cursor, { opacity: 1 }, { duration });
    };

    const moveTo: ScriptContext['moveTo'] = async (
      target,
      { duration = 0.5, ease = DEFAULT_EASE } = {},
    ) => {
      const pos = toPosition(target);
      const el = resolveElement(pos.ref);
      if (!el) return;
      const cursor = findCursor();
      if (!cursor) return;
      const point = cursorTarget(el, pos.anchor);
      await animate(
        cursor,
        { x: point.x, y: point.y },
        { duration, ease },
      );
    };

    const click: ScriptContext['click'] = async (target, opts = {}) => {
      const {
        duration = 0.5,
        ease = DEFAULT_EASE,
        pulse = true,
        pulseScale = 0.96,
        invoke,
      } = opts;
      const pos = toPosition(target);
      const el = resolveElement(pos.ref) as HTMLElement | null;
      if (!el) return;
      const cursor = findCursor();
      if (!cursor) return;
      const point = cursorTarget(el, pos.anchor);
      await animate(
        cursor,
        { x: point.x, y: point.y },
        { duration, ease },
      );
      if (pulse) {
        await animate(el, { scale: pulseScale }, { duration: 0.08 });
        await animate(el, { scale: 1 }, { duration: 0.14 });
      }
      if (invoke) {
        await registryRef.current?.invoke(
          invoke.ref.name,
          invoke.handle,
          invoke.args ?? [],
        );
      }
    };

    const hoverSequence: ScriptContext['hoverSequence'] = async (
      items,
      { perHoverWait = 280, duration = 0.4 } = {},
    ) => {
      const cursor = findCursor();
      for (const raw of items) {
        if (cancelled) return;
        const item: HoverSequenceItem =
          isRef(raw) || isRefPosition(raw) ? { ref: raw } : raw;
        const pos = toPosition(item.ref);
        const el = resolveElement(pos.ref);
        if (!el || !cursor) continue;
        const point = cursorTarget(el, pos.anchor);
        await animate(
          cursor,
          { x: point.x, y: point.y },
          { duration: item.duration ?? duration, ease: DEFAULT_EASE },
        );
        item.onHover?.();
        await wait(item.wait ?? perHoverWait);
      }
    };

    const invokeHandle: ScriptContext['invoke'] = async (ref, handle, ...args) => {
      return registryRef.current?.invoke(ref.name, handle, args);
    };

    const call: ScriptContext['call'] = <H extends string>(ref: ScriptRef<H>) =>
      new Proxy({} as Record<H, (...args: unknown[]) => Promise<unknown>>, {
        get(_target, prop) {
          if (typeof prop !== 'string') return undefined;
          return (...args: unknown[]) =>
            registryRef.current?.invoke(ref.name, prop, args);
        },
      });

    const typeInto: ScriptContext['typeInto'] = async (
      text,
      setter,
      { perChar = 32 } = {},
    ) => {
      for (let i = 0; i <= text.length; i++) {
        if (cancelled) return;
        setter(text.slice(0, i));
        await wait(perChar);
      }
    };

    const streamLines: ScriptContext['streamLines'] = async (
      lines,
      setter,
      { perChar = 14, perLineWait = 180 } = {},
    ) => {
      let acc = '';
      for (const line of lines) {
        for (let i = 0; i < line.length; i++) {
          if (cancelled) return;
          acc += line[i];
          setter(acc);
          await wait(perChar);
        }
        acc += '\n';
        setter(acc);
        if (cancelled) return;
        await wait(perLineWait);
      }
    };

    const ctx: ScriptContext = {
      cancelled: () => cancelled,
      container,
      wait,
      snap,
      animate: animateValues,
      hideCursor,
      showCursor,
      moveTo,
      click,
      hoverSequence,
      invoke: invokeHandle,
      call,
      typeInto,
      streamLines,
    };

    const loop = async () => {
      while (!cancelled) {
        await scriptRef.current(ctx);
      }
    };

    void loop();

    return () => {
      cancelled = true;
    };
  }, [animate, scope, enabled]);

  return { scope };
}
