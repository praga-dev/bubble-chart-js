# bubble-chart-js — AI Agent Instructions

This document gives AI coding agents (Copilot, Cursor, Claude, etc.) the context needed
to contribute features confidently without breaking core behavior.

---

## Project Overview

`bubble-chart-js` is a **zero-dependency** TypeScript library for rendering packed bubble charts.
It ships three bundles: CJS, ESM, and UMD. The public API surface is **small on purpose**.

```
initializeChart(config)  →  BubbleChart
chart.update(newData)
chart.on("bubble:click", fn)
chart.destroy()
chart.addLayerHook(hook)
topN(data, n)
```

---

## 1. Mathematical Model — Bubble Physics

### Radius Scaling

Bubble radius is proportional to the **square root** of the item's value relative to the maximum:

```
ratio    = sqrt(item.value / maxValue)          // [0, 1]
radius   = clamp(minRadius + ratio * (maxRadius - minRadius), minRadius, maxRadius)
maxRadius = min(containerShortSide * 0.25, containerShortSide / 2 - PADDING)
minRadius = max(maxRadius * 0.15, containerShortSide * 0.03)
```

This maps value → area proportionally (area ∝ r², so r ∝ sqrt(value)).

### Physics Simulation (layout.type: "physics")

Each tick applies four forces in order, then integrates velocity → position:

| Step | Force | Formula |
|------|-------|---------|
| 1 | Center attraction | `vx += (cx - x) * centerStrength * alpha` |
| 2 | Wall repulsion | `vx += (wallEdge - x) * wallStrength * alpha` when near wall |
| 3 | Collision resolution | Mass-weighted impulse: `massA = r²`, overlap separated by `(massB / total)` and `(massA / total)` |
| 4 | Velocity decay + cap | `vx *= velocityDecay`, then clamped to `maxVelocity` |

**Alpha decay**: `alpha *= (1 - alphaDecay)` each tick. Simulation stops when `alpha < alphaMin`.

**Seeded PRNG**: Initial scatter uses a deterministic LCG seeded by `layout.physics.seed`.
This guarantees reproducible layouts when `seed` is provided.

### Static Layout (layout.type: "static")

Bubbles are arranged in a single spiral pass — no forces, no animation loop after entry.
Largest bubble is placed at center; others spiral outward by decreasing value.

---

## 2. Rendering Architecture

### Renderer Selection

```
render.mode === "auto"    →  SVG if data.length ≤ 25, else Canvas
render.mode === "svg"     →  always SVG
render.mode === "canvas"  →  always Canvas
```

**Canvas** is the default for larger datasets and supports the full `glass` theme with GPU effects.
**SVG** supports up to 25 bubbles cleanly and is preferred for accessibility / print use cases.

### Layer Pipeline

Every frame renders six ordered layers:

```
background → shadows → bubbles → text → overlay → debug
```

Each layer is a list of `LayerHook`s sorted by `priority` (ascending). Lower priority runs first.
Built-in hooks use the ID prefix `"builtin:"` — you can remove or replace them:

```ts
chart.removeLayerHook("builtin:bubbles");
chart.addLayerHook({ layer: "bubbles", priority: 0, fn: myCustomDraw });
```

### DrawContext

Layer hook functions receive a `DrawContext`, not a raw canvas or SVG element:

```ts
type LayerHookFn = (ctx: DrawContext, bubbles: ReadonlyArray<BubbleState>, state: RenderFrameState) => void;

interface DrawContext {
  type:    "canvas" | "svg";
  canvas?: CanvasRenderingContext2D;   // truthy when type === "canvas"
  svg?:    SVGGElement;                // truthy when type === "svg"
}
```

**The renderer calls `ctx.save()` / `ctx.restore()` around every hook automatically.**
Hook authors must NOT call save/restore themselves.

### Glass Theme

Two quality levels controlled by `render.glassPerformanceHint`:

- `"safe"` (default): CSS `drop-shadow` filter — compatible everywhere
- `"full"`: `feGaussianBlur` bloom — GPU-accelerated, higher visual fidelity

Glass bubble drawing: radial gradient (lighten upper-left → full color → darken edge)
plus an inner highlight arc at `(rx - r*0.2, ry - r*0.25)` with arc from `1.1π` to `1.9π`.

---

## 3. Internal State Contract

`BubbleState` has a strict write ownership contract:

| Field group | Written by |
|-------------|-----------|
| `x, y, radius, vx, vy` | `ILayoutEngine` only |
| `renderX, renderY, renderRadius, renderScale` | `ITweenSystem` only |
| All render fields | **Renderer reads ONLY** — never writes back |

**Do not write layout fields from a renderer. Do not read `x`/`y` directly from a renderer.**
Always read `renderX`, `renderY`, `renderRadius` in draw code.

---

## 4. Event System

```ts
chart.on("simulation:tick",    (snap: SimulationSnapshot) => void)
chart.on("simulation:settled", (snap: SimulationSnapshot) => void)
chart.on("bubble:click",       ({ item: DataItem, event: PointerEvent }) => void)
chart.on("bubble:hover",       (item: DataItem | null) => void)
```

`chart.on()` returns an `UnsubscribeFn`. Event subscriptions survive `chart.update()` and are
only cleared by `chart.destroy()` or calling the returned unsubscribe function.

---

## 5. CSS & DOM — Class Naming Conventions

The library injects **no global CSS classes**. All styling is applied via inline styles on
the canvas/SVG elements to avoid collisions in React/Vue/Angular environments.

Container element (`canvasContainerId`) receives only `position: relative` if not already set.
The canvas or SVG is given `position: absolute; top: 0; left: 0; width: 100%; height: 100%`.

**If you need to target elements from outside**: use the container element's own class/id
that the consuming app provides. Do not add class names to internal library elements.

---

## 6. Adding a New Feature — Checklist

When an AI agent adds a new feature (e.g. a React wrapper, new animation type, new layout):

1. **New layout type**: implement `ILayoutEngine` (`src/interfaces/i-layout-engine.ts`),
   register it in `ChartOrchestrator`, add its config shape to `LayoutConfig` in `configuration.ts`.

2. **New animation**: add an easing function to `src/core/animation/tween.ts` `Easing` object
   and accept it via `AnimationConfig.transitionEasing`.

3. **New render hook**: use `chart.addLayerHook()` — do NOT modify built-in renderer internals.

4. **New public API method**: add to `BubbleChart` class and delegate to `ChartOrchestrator`.
   Keep `BubbleChart` as a thin façade — logic lives in the orchestrator.

5. **React wrapper** (planned): should be a separate package (`bubble-chart-js-react`) that
   wraps `initializeChart` in a `useEffect` / `useRef` pattern. The wrapper must call
   `chart.destroy()` in the `useEffect` cleanup. Do NOT import React into the core library.

6. **Tests**: unit tests live in `src/**/*.test.ts`, run with `npm test`.
   Add a test for any new public behavior.

7. **Build**: `npm run build` produces `dist/`. Never commit `dist/` directly — CI builds it.

---

## 7. What NOT to Do

- Do not import `React`, `Vue`, or any framework into `src/`.
- Do not commit `node_modules/`.
- Do not add a `postinstall` script that runs build steps.
- Do not use `document.querySelector` by class name inside the library — use the container ref.
- Do not exceed 25 SVG bubbles (the SVG renderer emits a warning above this; use Canvas).
- Do not write to physics fields (`x`, `y`, `radius`, `vx`, `vy`) from a renderer or hook.
