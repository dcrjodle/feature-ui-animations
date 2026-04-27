'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';

import type { ScriptRef } from './ref';

declare const process:
  | { env?: { NODE_ENV?: string } }
  | undefined;

const IS_PRODUCTION =
  typeof process !== 'undefined' &&
  process?.env?.NODE_ENV === 'production';

export type HandleFn = (...args: unknown[]) => unknown | Promise<unknown>;
export type HandleMap = Record<string, HandleFn>;

interface HandleRegistry {
  register(name: string, handles: HandleMap): () => void;
  invoke(name: string, handle: string, args: unknown[]): Promise<unknown>;
  has(name: string, handle: string): boolean;
}

const HandleRegistryContext = createContext<HandleRegistry | null>(null);

interface HandleRegistryProviderProps {
  children: ReactNode;
}

export function HandleRegistryProvider({ children }: HandleRegistryProviderProps) {
  const storeRef = useRef(new Map<string, HandleMap>());

  const registry = useMemo<HandleRegistry>(
    () => ({
      register(name, handles) {
        storeRef.current.set(name, handles);
        return () => {
          if (storeRef.current.get(name) === handles) {
            storeRef.current.delete(name);
          }
        };
      },
      has(name, handle) {
        return Boolean(storeRef.current.get(name)?.[handle]);
      },
      async invoke(name, handle, args) {
        const handles = storeRef.current.get(name);
        if (!handles) {
          if (!IS_PRODUCTION) {
            console.warn(
              `[feature-ui-animations] No handles registered for ref "${name}". ` +
                `Did you forget useScriptHandles?`,
            );
          }
          return undefined;
        }
        const fn = handles[handle];
        if (!fn) {
          if (!IS_PRODUCTION) {
            console.warn(
              `[feature-ui-animations] Handle "${handle}" not registered on ref "${name}". ` +
                `Available: ${Object.keys(handles).join(', ') || '(none)'}.`,
            );
          }
          return undefined;
        }
        return await fn(...args);
      },
    }),
    [],
  );

  return (
    <HandleRegistryContext.Provider value={registry}>
      {children}
    </HandleRegistryContext.Provider>
  );
}

export function useHandleRegistry(): HandleRegistry | null {
  return useContext(HandleRegistryContext);
}

/**
 * Register imperative handles for a ref so scripts can drive component state.
 *
 * @example
 * const dropdown = createRef('dropdown');
 *
 * function Dropdown() {
 *   const [open, setOpen] = useState(false);
 *   useScriptHandles(dropdown, {
 *     open: () => setOpen(true),
 *     close: () => setOpen(false),
 *   });
 *   ...
 * }
 */
export function useScriptHandles<H extends string>(
  ref: ScriptRef<H>,
  handles: Partial<Record<H, HandleFn>> & HandleMap,
): void {
  const registry = useHandleRegistry();
  const handlesRef = useRef(handles);
  handlesRef.current = handles;

  // Stable proxy so the registry sees the latest closures without re-registering on every render.
  const stable = useMemo<HandleMap>(() => {
    return new Proxy(
      {},
      {
        get(_target, prop) {
          if (typeof prop !== 'string') return undefined;
          return (...args: unknown[]) => {
            const fn = handlesRef.current[prop];
            return fn ? fn(...args) : undefined;
          };
        },
        has(_target, prop) {
          return typeof prop === 'string' && prop in handlesRef.current;
        },
        ownKeys() {
          return Object.keys(handlesRef.current);
        },
        getOwnPropertyDescriptor(_target, prop) {
          if (typeof prop !== 'string') return undefined;
          if (!(prop in handlesRef.current)) return undefined;
          return { enumerable: true, configurable: true };
        },
      },
    ) as HandleMap;
  }, []);

  // Use a ref to avoid the registry being re-created
  const refName = ref.name;
  const register = registry?.register;

  // Effect runs once per ref name change.
  useEffect(() => {
    if (!register) return;
    return register(refName, stable);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refName, register]);
}

export function useInvokeHandle() {
  const registry = useHandleRegistry();
  return useCallback(
    async (refName: string, handle: string, args: unknown[] = []) => {
      if (!registry) return undefined;
      return registry.invoke(refName, handle, args);
    },
    [registry],
  );
}
