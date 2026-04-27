import { REF_DATA_ATTR, REF_KEY_ATTR, refSelector } from './utils';

export type Anchor =
  | 'center'
  | 'topLeft'
  | 'topRight'
  | 'bottomLeft'
  | 'bottomRight';

export interface FractionalAnchor {
  x: number;
  y: number;
}

export interface RefPosition<Handles extends string = string> {
  __fuaPosition: true;
  ref: ScriptRef<Handles>;
  anchor: Anchor | FractionalAnchor;
}

export type RefBindAttrs =
  | { [REF_DATA_ATTR]: string }
  | { [REF_DATA_ATTR]: string; [REF_KEY_ATTR]: string };

export interface ScriptRef<Handles extends string = string> {
  __fuaRef: true;
  name: string;
  /** The ref's key, if this is a keyed sub-ref produced by `ref.key(value)`. */
  refKey: string | undefined;
  selector: string;

  /**
   * Spread onto an element to mark it as this ref's target. Pass an optional
   * key for keyed refs (one-of-many — e.g. table rows by id).
   */
  bind(key?: string): RefBindAttrs;

  /**
   * Address one specific instance of a keyed ref. Returns a sub-ref with its
   * own selector and bind() for that key.
   */
  key(value: string): ScriptRef<Handles>;

  /** Default position used when this ref is passed directly. Equals `center`. */
  readonly center: RefPosition<Handles>;
  readonly topLeft: RefPosition<Handles>;
  readonly topRight: RefPosition<Handles>;
  readonly bottomLeft: RefPosition<Handles>;
  readonly bottomRight: RefPosition<Handles>;

  /** Fractional position within the element. `{ x: 0.5, y: 0.5 }` is center. */
  at(point: FractionalAnchor): RefPosition<Handles>;
}

const makePosition = <H extends string>(
  ref: ScriptRef<H>,
  anchor: Anchor | FractionalAnchor,
): RefPosition<H> => ({
  __fuaPosition: true,
  ref,
  anchor,
});

export interface CreateRefOptions<Handles extends string> {
  /**
   * Optional list of declared handle names. Currently advisory — used only for
   * runtime warnings if a script invokes a handle that wasn't declared.
   */
  handles?: readonly Handles[];
}

interface InternalCreateOptions<H extends string> extends CreateRefOptions<H> {
  refKey?: string;
}

function buildRef<H extends string>(
  name: string,
  options: InternalCreateOptions<H>,
): ScriptRef<H> {
  const { refKey } = options;
  const selector = refSelector(name, refKey);

  const ref: ScriptRef<H> = {
    __fuaRef: true,
    name,
    refKey,
    selector,
    bind(key) {
      const effectiveKey = key ?? refKey;
      if (effectiveKey === undefined) {
        return { [REF_DATA_ATTR]: name };
      }
      return {
        [REF_DATA_ATTR]: name,
        [REF_KEY_ATTR]: effectiveKey,
      };
    },
    key(value) {
      return buildRef<H>(name, { ...options, refKey: value });
    },
    get center() {
      return makePosition(ref, 'center');
    },
    get topLeft() {
      return makePosition(ref, 'topLeft');
    },
    get topRight() {
      return makePosition(ref, 'topRight');
    },
    get bottomLeft() {
      return makePosition(ref, 'bottomLeft');
    },
    get bottomRight() {
      return makePosition(ref, 'bottomRight');
    },
    at(point) {
      return makePosition(ref, point);
    },
  };

  return ref;
}

export function createRef<Handles extends string = string>(
  name: string,
  options: CreateRefOptions<Handles> = {},
): ScriptRef<Handles> {
  if (!name || /\s/.test(name)) {
    throw new Error(
      `[feature-ui-animations] Invalid ref name "${name}". Use a non-empty string with no whitespace.`,
    );
  }
  return buildRef<Handles>(name, options);
}

export const isRef = (value: unknown): value is ScriptRef =>
  typeof value === 'object' && value !== null && (value as ScriptRef).__fuaRef === true;

export const isRefPosition = (value: unknown): value is RefPosition =>
  typeof value === 'object' &&
  value !== null &&
  (value as RefPosition).__fuaPosition === true;

export type RefOrPosition<H extends string = string> = ScriptRef<H> | RefPosition<H>;

export function toPosition<H extends string>(
  refOrPosition: RefOrPosition<H>,
): RefPosition<H> {
  if (isRefPosition(refOrPosition)) return refOrPosition;
  return refOrPosition.center;
}
