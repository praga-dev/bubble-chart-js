# AI Agent Compatibility Audit — bubble-chart-js

**Date:** 2026-04-03
**Scope:** Make the codebase legible and contributable by AI coding agents (Copilot, Cursor, Claude, etc.)

---

## Summary of Changes

| # | What | File(s) | Status |
|---|------|---------|--------|
| 1 | Fixed broken `"types"` path in package.json | `package.json` | Bug fix |
| 2 | Added Dependabot config for automated dependency PRs | `.github/dependabot.yml` | New file |
| 3 | Added AI agent instructions with full architecture docs | `.github/copilot-instructions.md` | New file |
| 4 | Added visual smoke test page for PR feedback loop | `spec/visual-smoke.html` | New file |

---

## 1. Bug Fix — `"types"` Path in `package.json`

### Problem

`package.json` had:

```json
"types": "dist/index.d.ts"
```

The actual compiled declaration file lives at `dist/src/index.d.ts` because `tsconfig.json` sets
`"rootDir": "."` — TypeScript preserves the `src/` path segment when emitting to `declarationDir`.

This silently broke type resolution for every TypeScript consumer and every AI agent doing
autocomplete. The package looked untyped to `tsc`, VS Code IntelliSense, and tools like
`@arethetypeswrong/cli`.

### Fix

```json
"types": "dist/src/index.d.ts"
```

### How to verify after a build

```bash
npm run build
find dist -name "index.d.ts"   # should print: dist/src/index.d.ts
```

If `tsconfig.json`'s `rootDir` or `declarationDir` ever changes, re-check this path.

---

## 2. Dependency Automation — `.github/dependabot.yml`

### Security audit result

```
npm audit → found 0 vulnerabilities
```

The project has **zero runtime dependencies** — all entries in `package.json` are `devDependencies`.
Security risk is minimal, but keeping dev tooling up to date prevents CI drift and
ensures AI agents don't encounter deprecation noise.

### Dependabot configuration decisions

| Setting | Value | Reason |
|---------|-------|--------|
| Schedule | Weekly, Monday 09:00 IST | Low-noise cadence |
| Grouping | 4 groups: ts-toolchain, jest, webpack, linting | One PR per tool family, not per package |
| Major versions | Ignored (no auto-PR) | May require migration work, reviewed manually |
| PR limit | 4 concurrent | Prevents inbox flooding |
| Labels | `dependencies`, `automated` | Easy to filter/auto-assign |

### Groups defined

- **typescript-toolchain**: `typescript`, `ts-*`, `@typescript-eslint/*`
- **jest**: `jest`, `@types/jest`, `ts-jest`
- **webpack**: `webpack`, `webpack-*`
- **linting**: `eslint`, `eslint-*`, `prettier`, `eslint-config-prettier`, `eslint-plugin-prettier`

---

## 3. AI Agent Instructions — `.github/copilot-instructions.md`

This file is the primary onboarding document for AI agents. It covers everything an agent
needs to contribute without breaking core behavior.

### Contents

#### Mathematical model

- **Radius formula**: `r ∝ sqrt(value / maxValue)` — maps value to area proportionally
- **Physics simulation**: four ordered force steps per tick
  1. Center attraction: `vx += (cx - x) * centerStrength * alpha`
  2. Wall repulsion: impulse when bubble approaches PADDING boundary
  3. Collision resolution: mass-weighted (`mass = r²`), O(n²) — acceptable at ≤25 bubbles
  4. Velocity decay + cap: `vx *= velocityDecay`, clamped to `maxVelocity`
- **Alpha decay**: `alpha *= (1 - alphaDecay)` per tick; stops at `alpha < alphaMin`
- **Seeded PRNG**: LCG seeded from `layout.physics.seed` for deterministic layouts

#### Renderer selection

```
render.mode === "auto"   → SVG if data.length ≤ 25, else Canvas
render.mode === "svg"    → always SVG
render.mode === "canvas" → always Canvas
```

#### Layer pipeline

```
background → shadows → bubbles → text → overlay → debug
```

Each layer holds `LayerHook[]` sorted by `priority` (ascending). Built-in hooks use the
`"builtin:"` ID prefix and can be removed/replaced via `chart.removeLayerHook(id)`.

#### Internal state ownership contract

| Field group | Owned by |
|-------------|---------|
| `x, y, radius, vx, vy` | `ILayoutEngine` only |
| `renderX, renderY, renderRadius, renderScale` | `ITweenSystem` only |
| All render fields | Renderer **reads only** — never writes back |

This is the most common source of subtle bugs when agents add features. The instructions
explicitly forbid reading `x`/`y` directly in draw code (use `renderX`/`renderY`).

#### React wrapper guidance (future)

The instructions pre-document the correct scaffold pattern so an agent can implement it
without asking:
- Must be a separate package (`bubble-chart-js-react`)
- Wraps `initializeChart` in `useEffect` + `useRef`
- Must call `chart.destroy()` in the `useEffect` cleanup
- Must never import React into the core `src/`

---

## 4. Visual Smoke Test — `spec/visual-smoke.html`

### Purpose

Gives AI agents (and humans) a fast visual feedback loop to confirm a contributed feature
didn't break core rendering. An agent can open this page after `npm run build` and compare
against the written pass criteria before submitting a PR.

### Usage

```bash
npm run build
# then open spec/visual-smoke.html in a browser
# (or: npx serve . and navigate to /spec/visual-smoke.html)
```

### Test cases

| ID | Scenario | Key assertion |
|----|----------|---------------|
| TC-01 | Flat theme / physics / 8 bubbles | No overlap, largest bubble visually biggest, physics settles |
| TC-02 | Glass theme / canvas / 6 bubbles | Radial gradient + inner highlight arc visible |
| TC-03 | Static layout / SVG / 10 bubbles | Tight cluster, largest at center, no animation loop |
| TC-04 | `chart.update()` reconciliation | Survivors tween smoothly, removed items disappear, new item scales in |
| TC-05 | `topN()` selector filtering 20→5 | Exactly 5 bubbles, largest value dominates, no low-value items |
| TC-06 | Custom overlay `LayerHook` | Yellow dashed ring around largest bubble, updates with physics |

Each case has explicit pass criteria written inline in a `<details>` block.

---

## Architecture Reference

### File map for common contribution tasks

| Task | Start here |
|------|-----------|
| New layout algorithm | `src/interfaces/i-layout-engine.ts` → implement, register in `src/orchestration/chart-orchestrator.ts`, add config to `src/models/public/configuration.ts` |
| New easing function | `src/core/animation/tween.ts` — add to `Easing` object |
| New public API method | `src/models/public/bubble-chart.ts` (thin façade) → delegate to `src/orchestration/chart-orchestrator.ts` |
| New render feature | `chart.addLayerHook()` — do NOT modify built-in renderer internals |
| New event type | `src/core/event-bus.ts` — add to `EventMap` interface |
| Config option | `src/models/public/configuration.ts` → add to relevant sub-interface |

### Key invariants

- Zero runtime dependencies — keep it that way
- `BubbleChart` is a thin façade; all logic in `ChartOrchestrator`
- No global CSS class names — all styling is inline to avoid framework collisions
- SVG renderer is capped at 25 bubbles (emits warning above this)
- `dist/` is build output — never commit it manually; CI builds it from `src/`
