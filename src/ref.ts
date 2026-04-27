import { REF_DATA_ATTR, refSelector } from './utils';

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

export interface ScriptRef<Handles extends string = string> {
  __fuaRef: true;
  name: string;
  selector: string;
  bind: () => { [REF_DATA_ATTR]: string };

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

export function createRef<Handles extends string = string>(
  name: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _options: CreateRefOptions<Handles> = {},
): ScriptRef<Handles> {
  if (!name || /\s/.test(name)) {
    throw new Error(
      `[feature-ui-animations] Invalid ref name "${name}". Use a non-empty string with no whitespace.`,
    );
  }

  const ref: ScriptRef<Handles> = {
    __fuaRef: true,
    name,
    selector: refSelector(name),
    bind: () => ({ [REF_DATA_ATTR]: name }),
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
