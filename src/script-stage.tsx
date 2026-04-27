'use client';

import {
  forwardRef,
  useImperativeHandle,
  type HTMLAttributes,
  type ReactNode,
} from 'react';

import { HandleRegistryProvider } from './handles';
import { useScriptedDemo, type Script } from './use-scripted-demo';

export interface ScriptStageHandle {
  /** The container element. Useful for measurements / Storybook controls. */
  container: HTMLDivElement | null;
}

export interface ScriptStageProps extends HTMLAttributes<HTMLDivElement> {
  script: Script;
  enabled?: boolean;
  children: ReactNode;
}

/**
 * Mounts a scripted demo. Wrap any layout you want to animate.
 *
 * The stage:
 *   1. Provides a HandleRegistry context for `useScriptHandles`.
 *   2. Owns the motion `scope` and runs the script in a loop.
 *   3. Forwards a div ref so you can size / style it like normal.
 *
 * Place an `<AnimationCursor />` inside if you want the visual cursor.
 */
export const ScriptStage = forwardRef<ScriptStageHandle, ScriptStageProps>(
  function ScriptStage({ script, enabled, children, ...divProps }, ref) {
    return (
      <HandleRegistryProvider>
        <ScriptStageInner
          script={script}
          enabled={enabled}
          handleRef={ref}
          {...divProps}
        >
          {children}
        </ScriptStageInner>
      </HandleRegistryProvider>
    );
  },
);

interface ScriptStageInnerProps extends HTMLAttributes<HTMLDivElement> {
  script: Script;
  enabled?: boolean;
  handleRef: React.ForwardedRef<ScriptStageHandle>;
  children: ReactNode;
}

function ScriptStageInner({
  script,
  enabled,
  handleRef,
  children,
  ...divProps
}: ScriptStageInnerProps) {
  const { scope } = useScriptedDemo(script, { enabled });

  useImperativeHandle(
    handleRef,
    () => ({
      get container() {
        return scope.current;
      },
    }),
    [scope],
  );

  return (
    <div ref={scope} {...divProps}>
      {children}
    </div>
  );
}
