# feature-ui-animations

Scriptable, ref-based UI animation engine for React. Drive any component with a virtual cursor, time-sequenced animations, and imperative handles — agnostic of your UI library.

```bash
npm install feature-ui-animations motion
```

Peer deps: `react >= 18`, `react-dom >= 18`, `motion >= 12`.

## Why

The classic "animated demo" pattern (cursor moves, clicks, and reveals over a static UI) usually ends up coupled to selectors and inline state. This package separates concerns:

- **Refs** identify elements without CSS selectors.
- **Handles** let scripts call back into your component state (`open`, `close`, `setBgColor`).
- **Scripts** are plain async functions composing primitives like `click`, `moveTo`, `animate`, `invoke`.

You bring the components — the engine drives them.

## Quick start

```tsx
'use client';

import { useState } from 'react';
import {
  AnimationCursor,
  ScriptStage,
  createRef,
  useScriptHandles,
  type Script,
} from 'feature-ui-animations';

const trigger = createRef('trigger');
const dropdown = createRef<'open' | 'close'>('dropdown');
const option = createRef('option');

function Dropdown() {
  const [open, setOpen] = useState(false);
  useScriptHandles(dropdown, {
    open: () => setOpen(true),
    close: () => setOpen(false),
  });
  if (!open) return null;
  return (
    <div {...dropdown.bind()} className="...">
      <div {...option.bind()}>In Progress</div>
    </div>
  );
}

const script: Script = async (ctx) => {
  await ctx.snap(dropdown, { opacity: 0, y: -4 });
  await ctx.wait(500);
  await ctx.showCursor();

  // Click trigger AND tell the dropdown component to open in the same beat.
  await ctx.click(trigger, { invoke: { ref: dropdown, handle: 'open' } });

  await ctx.animate(dropdown, { opacity: 1, y: 0 });
  await ctx.moveTo(option.center);
  await ctx.wait(1600);

  await ctx.invoke(dropdown, 'close');
  await ctx.hideCursor();
};

export function Demo() {
  return (
    <ScriptStage script={script} className="relative h-[260px] w-[520px]">
      <button {...trigger.bind()}>Status</button>
      <Dropdown />
      <AnimationCursor />
    </ScriptStage>
  );
}
```

## Concepts

### Refs

`createRef(name)` returns a ref object. Spread `ref.bind()` onto any element to mark it.

```tsx
const trigger = createRef('trigger');
<button {...trigger.bind()}>Click</button>;
```

A ref has positional accessors used by cursor moves:

```ts
trigger.center      // default
trigger.topLeft
trigger.topRight
trigger.bottomLeft
trigger.bottomRight
trigger.at({ x: 0.5, y: 0.5 })   // fractional
```

`ctx.click(trigger)` defaults to `trigger.center`.

### Keyed refs (one-of-many)

For dynamic lists, declare a single ref and bind each item with a key:

```tsx
const row = createRef('job-row');

{jobs.map((j) => (
  <TableRow key={j.id} {...row.bind(j.id)}>...</TableRow>
))}
```

Then in scripts:

```ts
await ctx.click(row.key('build-42'));
await ctx.hoverSequence(jobs.map((j) => row.key(j.id)));
```

`row.key(id)` returns a sub-ref with its own selector and `bind()` — addressable, animatable, and invokable just like a regular ref.

### Cursor as a ref

`cursorRef` is exported and bound automatically by `<AnimationCursor>`. Use it like any other ref:

```ts
await ctx.snap(cursorRef, { x: 40, y: 40, opacity: 0 });
await ctx.animate(cursorRef, { opacity: 0 }, { duration: 0.3 });
```

`ctx.showCursor()` / `ctx.hideCursor({ duration })` are sugar over the same calls.

### Handles

Components register imperative handles so scripts can drive state without poking the DOM:

```tsx
useScriptHandles(dropdown, {
  open: () => setOpen(true),
  close: () => setOpen(false),
  setBgColor: (color: string) => setBg(color),
});
```

Then in the script:

```ts
await ctx.invoke(dropdown, 'open');
await ctx.call(dropdown).setBgColor('red');     // sugar
```

### Script context

| Method | What it does |
|---|---|
| `wait(ms)` | Pause. |
| `showCursor() / hideCursor()` | Toggle the `<AnimationCursor>`. |
| `moveTo(refOrPos, opts?)` | Move the cursor. |
| `click(refOrPos, opts?)` | Move + pulse the element. Optional `{ invoke }` for a combined call. |
| `hoverSequence(items, opts?)` | Sweep through refs/positions with per-step waits. |
| `animate(ref, values, opts?)` | Animate motion values on the ref's element. |
| `snap(ref, values)` | Set values instantly. |
| `invoke(ref, handle, ...args)` | Call a registered handle. |
| `call(ref).<handle>(...)` | Sugar for `invoke`. |
| `typeInto(text, setter, opts?)` | Stream text into a controlled input. |
| `streamLines(lines, setter, opts?)` | Stream multi-line text. |

The script is run on a loop until the component unmounts. Use `ctx.cancelled()` if you build long-running custom steps.

### Stage

`<ScriptStage>` mounts the engine, provides the handle registry, and owns the scope div.

```tsx
<ScriptStage script={script} className="relative h-[260px] w-[520px]" enabled>
  ...your UI + <AnimationCursor />...
</ScriptStage>
```

Pass `enabled={false}` to pause the loop.

## Styling

The cursor uses `text-foreground` and `var(--background)` so it inherits your shadcn-style theme. Override with `<AnimationCursor className="text-blue-500" />` if needed.

## License

MIT — see [LICENSE](./LICENSE).
