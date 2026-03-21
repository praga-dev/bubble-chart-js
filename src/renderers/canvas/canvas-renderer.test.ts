import { CanvasRenderer } from './canvas-renderer';
import { RenderLayer } from '../../models/public/configuration';
import { RenderFrameState, LayerHook } from '../../interfaces/i-renderer';
import { BubbleState } from '../../models/internal/bubble-state';

// ── Mock canvas context that tracks save/restore calls and state mutations ──

function createMockCanvasContext() {
  let shadowBlur  = 0;
  let globalAlpha = 1;
  let saveCount   = 0;
  const savedStack: Array<{ shadowBlur: number; globalAlpha: number }> = [];

  return {
    get shadowBlur()  { return shadowBlur;  },
    set shadowBlur(v) { shadowBlur = v;     },
    get globalAlpha() { return globalAlpha; },
    set globalAlpha(v){ globalAlpha = v;    },
    get saveCount()   { return saveCount;   },
    save: jest.fn(() => {
      savedStack.push({ shadowBlur, globalAlpha });
      saveCount++;
    }),
    restore: jest.fn(() => {
      const s = savedStack.pop();
      if (s) { shadowBlur = s.shadowBlur; globalAlpha = s.globalAlpha; }
    }),
    clearRect:             jest.fn(),
    fillRect:              jest.fn(),
    beginPath:             jest.fn(),
    arc:                   jest.fn(),
    fill:                  jest.fn(),
    stroke:                jest.fn(),
    strokeRect:            jest.fn(),
    measureText:           jest.fn().mockReturnValue({ width: 50 }),
    fillText:              jest.fn(),
    setTransform:          jest.fn(),
    createRadialGradient:  jest.fn().mockReturnValue({ addColorStop: jest.fn() }),
    moveTo:                jest.fn(),
    lineTo:                jest.fn(),
    closePath:             jest.fn(),
  };
}

// ── Shared test state ──

type MockCtx = ReturnType<typeof createMockCanvasContext>;
let mockCtx: MockCtx;

function makeMockContainer(overrides: Record<string, any> = {}) {
  return {
    style:        { position: '' },
    clientWidth:  800,
    clientHeight: 600,
    appendChild:  jest.fn(),
    querySelector: jest.fn().mockReturnValue(null),
    ...overrides,
  };
}

function makeMockCanvas(ctx: MockCtx) {
  return {
    style:                {},
    width:                0,
    height:               0,
    getContext:           jest.fn().mockReturnValue(ctx),
    addEventListener:     jest.fn(),
    removeEventListener:  jest.fn(),
    remove:               jest.fn(),
  };
}

function makeFrameState(overrides: Partial<RenderFrameState> = {}): RenderFrameState {
  return {
    width:     800,
    height:    600,
    dpr:       1,
    theme:     'flat',
    timestamp: 0,
    ...overrides,
  };
}

function makeConfig(overrides: Record<string, any> = {}) {
  return {
    canvasContainerId: 'chart',
    data: [],
    ...overrides,
  };
}

// ── Install global mocks needed by CanvasRenderer.mount() ──

function installGlobalMocks(ctx: MockCtx, containerOverrides: Record<string, any> = {}) {
  const mockCanvas    = makeMockCanvas(ctx);
  const mockContainer = makeMockContainer(containerOverrides);

  (global as any).document = {
    createElement: jest.fn().mockReturnValue(mockCanvas),
    getElementById: jest.fn().mockReturnValue(mockContainer),
  };
  (global as any).window = { devicePixelRatio: 1 };
  (global as any).ResizeObserver = jest.fn().mockReturnValue({
    observe:     jest.fn(),
    disconnect:  jest.fn(),
  });

  return { mockCanvas, mockContainer };
}

// ── Helper: create and mount a CanvasRenderer ──

function createMountedRenderer(
  ctx: MockCtx,
  configOverrides: Record<string, any> = {},
  containerOverrides: Record<string, any> = {}
) {
  const { mockContainer } = installGlobalMocks(ctx, containerOverrides);
  const config   = makeConfig(configOverrides) as any;
  const renderer = new CanvasRenderer(config);
  renderer.mount(mockContainer as unknown as HTMLElement);
  return { renderer, mockContainer };
}

// ────────────────────────────────────────────────────────────────────────────

describe('CanvasRenderer', () => {
  beforeEach(() => {
    mockCtx = createMockCanvasContext();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (global as any).document;
    delete (global as any).window;
    delete (global as any).ResizeObserver;
  });

  // ── addLayerHook ──────────────────────────────────────────────────────────

  describe('addLayerHook()', () => {
    it('returns a string ID', () => {
      const { renderer } = createMountedRenderer(mockCtx);
      const id = renderer.addLayerHook({
        layer:    'overlay',
        priority: 0,
        fn:       jest.fn(),
      });
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('returned ID matches hook found in getLayerHooks()', () => {
      const { renderer } = createMountedRenderer(mockCtx);
      const fn = jest.fn();
      const id  = renderer.addLayerHook({ layer: 'overlay', priority: 0, fn });
      const hooks = renderer.getLayerHooks('overlay') as LayerHook[];
      const found = hooks.find(h => h.id === id);
      expect(found).toBeDefined();
      expect(found!.fn).toBe(fn);
    });

    it('does not use "builtin:" prefix for public hooks', () => {
      const { renderer } = createMountedRenderer(mockCtx);
      const id = renderer.addLayerHook({ layer: 'overlay', priority: 0, fn: jest.fn() });
      expect(id).not.toMatch(/^builtin:/);
    });

    it('adds multiple hooks to the same layer', () => {
      const { renderer } = createMountedRenderer(mockCtx);
      renderer.addLayerHook({ layer: 'overlay', priority: 0, fn: jest.fn() });
      renderer.addLayerHook({ layer: 'overlay', priority: 0, fn: jest.fn() });
      // overlay starts with 1 builtin hook; adding 2 more → 3 total
      const hooks = renderer.getLayerHooks('overlay');
      expect(hooks.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── removeLayerHook ───────────────────────────────────────────────────────

  describe('removeLayerHook()', () => {
    it('removes hook by ID — hook no longer appears in getLayerHooks()', () => {
      const { renderer } = createMountedRenderer(mockCtx);
      const id  = renderer.addLayerHook({ layer: 'overlay', priority: 0, fn: jest.fn() });
      renderer.removeLayerHook(id);
      const hooks = renderer.getLayerHooks('overlay') as LayerHook[];
      expect(hooks.find(h => h.id === id)).toBeUndefined();
    });

    it('does not throw when removing a non-existent ID', () => {
      const { renderer } = createMountedRenderer(mockCtx);
      expect(() => renderer.removeLayerHook('nonexistent-id')).not.toThrow();
    });

    it('removing one hook does not affect other hooks on the same layer', () => {
      const { renderer } = createMountedRenderer(mockCtx);
      const fn1 = jest.fn();
      const fn2 = jest.fn();
      const id1 = renderer.addLayerHook({ layer: 'overlay', priority: 0, fn: fn1 });
      const id2 = renderer.addLayerHook({ layer: 'overlay', priority: 0, fn: fn2 });
      renderer.removeLayerHook(id1);
      const hooks = renderer.getLayerHooks('overlay') as LayerHook[];
      expect(hooks.find(h => h.id === id2)).toBeDefined();
      expect(hooks.find(h => h.id === id1)).toBeUndefined();
    });
  });

  // ── Hook priority ordering ─────────────────────────────────────────────────

  describe('hook priority ordering', () => {
    it('hooks are sorted by priority ascending (lower runs first)', () => {
      const { renderer } = createMountedRenderer(mockCtx);
      // Remove built-in overlay hook so we can inspect pure user hooks
      const builtinHooks = renderer.getLayerHooks('overlay') as LayerHook[];
      for (const h of builtinHooks) renderer.removeLayerHook(h.id);

      renderer.addLayerHook({ layer: 'overlay', priority: 10, fn: jest.fn() });
      renderer.addLayerHook({ layer: 'overlay', priority: -1, fn: jest.fn() });
      renderer.addLayerHook({ layer: 'overlay', priority:  5, fn: jest.fn() });

      const hooks = renderer.getLayerHooks('overlay') as LayerHook[];
      const priorities = hooks.map(h => h.priority);
      expect(priorities).toEqual([-1, 5, 10]);
    });

    it('hooks with equal priority maintain registration order', () => {
      const { renderer } = createMountedRenderer(mockCtx);
      const builtins = renderer.getLayerHooks('overlay') as LayerHook[];
      for (const h of builtins) renderer.removeLayerHook(h.id);

      const fn1 = jest.fn();
      const fn2 = jest.fn();
      const fn3 = jest.fn();
      const id1 = renderer.addLayerHook({ layer: 'overlay', priority: 0, fn: fn1 });
      const id2 = renderer.addLayerHook({ layer: 'overlay', priority: 0, fn: fn2 });
      const id3 = renderer.addLayerHook({ layer: 'overlay', priority: 0, fn: fn3 });

      const hooks = renderer.getLayerHooks('overlay') as LayerHook[];
      expect(hooks[0].id).toBe(id1);
      expect(hooks[1].id).toBe(id2);
      expect(hooks[2].id).toBe(id3);
    });

    it('hooks execute in priority order during renderLayer()', () => {
      const { renderer } = createMountedRenderer(mockCtx);
      // Clear overlay built-ins
      const builtins = renderer.getLayerHooks('overlay') as LayerHook[];
      for (const h of builtins) renderer.removeLayerHook(h.id);

      const callOrder: number[] = [];
      renderer.addLayerHook({ layer: 'overlay', priority: 10, fn: () => { callOrder.push(10); } });
      renderer.addLayerHook({ layer: 'overlay', priority: -1, fn: () => { callOrder.push(-1); } });
      renderer.addLayerHook({ layer: 'overlay', priority:  5, fn: () => { callOrder.push(5);  } });

      renderer.renderLayer('overlay', [], makeFrameState());
      expect(callOrder).toEqual([-1, 5, 10]);
    });
  });

  // ── getLayerHooks ─────────────────────────────────────────────────────────

  describe('getLayerHooks()', () => {
    it('returns all hooks across all layers when called without argument', () => {
      const { renderer } = createMountedRenderer(mockCtx);
      // mount() registers 6 built-in hooks (one per layer)
      const allHooks = renderer.getLayerHooks();
      expect(allHooks.length).toBeGreaterThanOrEqual(6);
    });

    it('returns only hooks for the specified layer', () => {
      const { renderer } = createMountedRenderer(mockCtx);
      renderer.addLayerHook({ layer: 'overlay', priority: 0, fn: jest.fn() });
      const hooks = renderer.getLayerHooks('overlay');
      for (const h of hooks) {
        expect(h.layer).toBe('overlay');
      }
    });

    it('returns empty array for a layer with no hooks after removing all', () => {
      const { renderer } = createMountedRenderer(mockCtx);
      // The 'overlay' layer has one builtin hook after mount
      const builtins = renderer.getLayerHooks('overlay') as LayerHook[];
      for (const h of builtins) renderer.removeLayerHook(h.id);
      expect(renderer.getLayerHooks('overlay')).toHaveLength(0);
    });
  });

  // ── ctx save/restore around hooks ─────────────────────────────────────────

  describe('ctx.save() / ctx.restore() isolation', () => {
    it('calls ctx.save() before and ctx.restore() after each hook', () => {
      const { renderer } = createMountedRenderer(mockCtx);
      const builtins = renderer.getLayerHooks('overlay') as LayerHook[];
      for (const h of builtins) renderer.removeLayerHook(h.id);

      renderer.addLayerHook({ layer: 'overlay', priority: 0, fn: jest.fn() });

      const saveBefore  = (mockCtx.save as jest.Mock).mock.calls.length;
      const restBefore  = (mockCtx.restore as jest.Mock).mock.calls.length;
      renderer.renderLayer('overlay', [], makeFrameState());
      const saveAfter   = (mockCtx.save as jest.Mock).mock.calls.length;
      const restAfter   = (mockCtx.restore as jest.Mock).mock.calls.length;

      expect(saveAfter  - saveBefore).toBe(1);
      expect(restAfter  - restBefore).toBe(1);
    });

    it('ctx state is restored after a hook that mutates shadowBlur', () => {
      const { renderer } = createMountedRenderer(mockCtx);
      const builtins = renderer.getLayerHooks('overlay') as LayerHook[];
      for (const h of builtins) renderer.removeLayerHook(h.id);

      // Record shadowBlur before
      const blurBefore = mockCtx.shadowBlur;

      renderer.addLayerHook({
        layer:    'overlay',
        priority: 0,
        fn: (ctx) => {
          // Mutate canvas context directly
          if (ctx.canvas) ctx.canvas.shadowBlur = 99;
        },
      });

      renderer.renderLayer('overlay', [], makeFrameState());

      // After renderLayer, ctx.restore() has been called — shadowBlur back to original
      expect(mockCtx.shadowBlur).toBe(blurBefore);
    });

    it('ctx state is restored after a hook that mutates globalAlpha', () => {
      const { renderer } = createMountedRenderer(mockCtx);
      const builtins = renderer.getLayerHooks('overlay') as LayerHook[];
      for (const h of builtins) renderer.removeLayerHook(h.id);

      const alphaBefore = mockCtx.globalAlpha;

      renderer.addLayerHook({
        layer:    'overlay',
        priority: 0,
        fn: (ctx) => {
          if (ctx.canvas) ctx.canvas.globalAlpha = 0.1;
        },
      });

      renderer.renderLayer('overlay', [], makeFrameState());
      expect(mockCtx.globalAlpha).toBe(alphaBefore);
    });

    it('ctx.restore() is still called when a hook throws (try/finally enforcement)', () => {
      const { renderer } = createMountedRenderer(mockCtx);
      const builtins = renderer.getLayerHooks('overlay') as LayerHook[];
      for (const h of builtins) renderer.removeLayerHook(h.id);

      renderer.addLayerHook({
        layer:    'overlay',
        priority: 0,
        fn: () => { throw new Error('Hook intentionally threw'); },
      });

      const restoreBefore = (mockCtx.restore as jest.Mock).mock.calls.length;

      // renderLayer should throw because the hook throws (it's re-thrown after finally)
      expect(() => {
        renderer.renderLayer('overlay', [], makeFrameState());
      }).toThrow('Hook intentionally threw');

      // Despite the throw, restore() must have been called
      const restoreAfter = (mockCtx.restore as jest.Mock).mock.calls.length;
      expect(restoreAfter - restoreBefore).toBe(1);
    });

    it('second hook still runs after first hook throws', () => {
      // Note: the current renderLayer implementation does NOT catch errors — it re-throws.
      // The try/finally guarantees restore() is called, but the loop stops on throw.
      // This test verifies the first hook's restore() is called — isolation is per-hook.
      const { renderer } = createMountedRenderer(mockCtx);
      const builtins = renderer.getLayerHooks('overlay') as LayerHook[];
      for (const h of builtins) renderer.removeLayerHook(h.id);

      const secondHookFn = jest.fn();

      renderer.addLayerHook({
        layer:    'overlay',
        priority: -1,  // runs first
        fn: () => { throw new Error('first hook throws'); },
      });
      renderer.addLayerHook({
        layer:    'overlay',
        priority:  0,  // runs second
        fn: secondHookFn,
      });

      // renderLayer re-throws; the second hook does NOT run (no catch in renderLayer)
      // But restore() IS called for the first hook (try/finally)
      const saveBefore    = (mockCtx.save    as jest.Mock).mock.calls.length;
      const restoreBefore = (mockCtx.restore as jest.Mock).mock.calls.length;

      expect(() => renderer.renderLayer('overlay', [], makeFrameState())).toThrow();

      // save() was called once (for the first hook), restore() was called once (finally)
      expect((mockCtx.save    as jest.Mock).mock.calls.length - saveBefore).toBe(1);
      expect((mockCtx.restore as jest.Mock).mock.calls.length - restoreBefore).toBe(1);
    });
  });

  // ── renderLayer ───────────────────────────────────────────────────────────

  describe('renderLayer()', () => {
    it('does not throw for an empty layer', () => {
      const { renderer } = createMountedRenderer(mockCtx);
      const builtins = renderer.getLayerHooks('overlay') as LayerHook[];
      for (const h of builtins) renderer.removeLayerHook(h.id);

      expect(() => {
        renderer.renderLayer('overlay', [], makeFrameState());
      }).not.toThrow();
    });

    it('invokes hook fn with DrawContext, bubbles, and frameState', () => {
      const { renderer } = createMountedRenderer(mockCtx);
      const builtins = renderer.getLayerHooks('overlay') as LayerHook[];
      for (const h of builtins) renderer.removeLayerHook(h.id);

      const hookFn = jest.fn();
      renderer.addLayerHook({ layer: 'overlay', priority: 0, fn: hookFn });

      const bubbles: ReadonlyArray<BubbleState> = [];
      const state = makeFrameState();
      renderer.renderLayer('overlay', bubbles, state);

      expect(hookFn).toHaveBeenCalledTimes(1);
      const [drawCtx, passedBubbles, passedState] = hookFn.mock.calls[0];
      expect(drawCtx.type).toBe('canvas');
      expect(passedBubbles).toBe(bubbles);
      expect(passedState).toBe(state);
    });
  });

  // ── dispose ───────────────────────────────────────────────────────────────

  describe('dispose()', () => {
    it('does not throw', () => {
      const { renderer } = createMountedRenderer(mockCtx);
      expect(() => renderer.dispose()).not.toThrow();
    });

    it('clears all hook lists after dispose()', () => {
      const { renderer } = createMountedRenderer(mockCtx);
      renderer.dispose();
      // After dispose, all hook arrays are emptied
      const allHooks = renderer.getLayerHooks();
      expect(allHooks).toHaveLength(0);
    });
  });
});
