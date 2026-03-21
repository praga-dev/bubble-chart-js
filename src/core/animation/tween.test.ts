import { stepTween, stepScale, initBubbleEntry, initBubbleTransition, Easing } from './tween';
import { BubbleState } from '../../models/internal/bubble-state';

function makeBubble(overrides?: Partial<BubbleState>): BubbleState {
  return {
    id:           'test',
    label:        'Test',
    value:        100,
    color:        '#ff0000',
    x:            100,
    y:            100,
    radius:       50,
    vx:           0,
    vy:           0,
    renderX:      100,
    renderY:      100,
    renderRadius: 50,
    renderScale:  1,
    targetScale:  1,
    tweenProgress: 1,
    tweenFrom:    undefined,
    shadowDirty:  false,
    ...overrides,
  };
}

describe('initBubbleEntry', () => {
  it('sets renderScale to 0', () => {
    const b = makeBubble({ renderScale: 1 });
    initBubbleEntry(b);
    expect(b.renderScale).toBe(0);
  });

  it('sets targetScale to 1', () => {
    const b = makeBubble({ targetScale: 2 });
    initBubbleEntry(b);
    expect(b.targetScale).toBe(1);
  });

  it('sets tweenProgress to 0', () => {
    const b = makeBubble({ tweenProgress: 1 });
    initBubbleEntry(b);
    expect(b.tweenProgress).toBe(0);
  });

  it('clears tweenFrom to undefined', () => {
    const b = makeBubble({ tweenFrom: { x: 0, y: 0, radius: 10 } });
    initBubbleEntry(b);
    expect(b.tweenFrom).toBeUndefined();
  });

  it('sets shadowDirty to true', () => {
    const b = makeBubble({ shadowDirty: false });
    initBubbleEntry(b);
    expect(b.shadowDirty).toBe(true);
  });

  it('syncs renderX/Y/Radius to physics position at entry', () => {
    const b = makeBubble({ x: 200, y: 300, radius: 75, renderX: 0, renderY: 0, renderRadius: 0 });
    initBubbleEntry(b);
    expect(b.renderX).toBe(200);
    expect(b.renderY).toBe(300);
    expect(b.renderRadius).toBe(75);
  });
});

describe('stepScale', () => {
  it('renderScale increases toward targetScale on each call', () => {
    const b = makeBubble({ renderScale: 0, targetScale: 1 });
    const before = b.renderScale;
    stepScale(b);
    expect(b.renderScale).toBeGreaterThan(before);
  });

  it('returns true while scale is still animating', () => {
    const b = makeBubble({ renderScale: 0, targetScale: 1 });
    const result = stepScale(b);
    expect(result).toBe(true);
  });

  it('returns false when scale settles within 0.001 of target', () => {
    // delta = 0.0005 < 0.001 → should settle
    const b = makeBubble({ renderScale: 0.9995, targetScale: 1.0 });
    const result = stepScale(b);
    expect(result).toBe(false);
  });

  it('snaps renderScale exactly to targetScale when settled', () => {
    const b = makeBubble({ renderScale: 0.9999, targetScale: 1.0 });
    stepScale(b);
    expect(b.renderScale).toBe(1.0);
  });

  it('converges toward targetScale over multiple steps', () => {
    const b = makeBubble({ renderScale: 0, targetScale: 1 });
    for (let i = 0; i < 200; i++) {
      const active = stepScale(b);
      if (!active) break;
    }
    expect(b.renderScale).toBeCloseTo(1.0, 3);
  });

  it('uses custom hoverEase factor when provided', () => {
    const bFast = makeBubble({ renderScale: 0, targetScale: 1 });
    const bSlow = makeBubble({ renderScale: 0, targetScale: 1 });
    stepScale(bFast, 0.5);  // fast
    stepScale(bSlow, 0.1);  // slow
    expect(bFast.renderScale).toBeGreaterThan(bSlow.renderScale);
  });

  it('works when targetScale < renderScale (shrinking)', () => {
    const b = makeBubble({ renderScale: 1.08, targetScale: 1.0 });
    const result = stepScale(b);
    expect(result).toBe(true);
    expect(b.renderScale).toBeLessThan(1.08);
  });
});

describe('stepTween', () => {
  describe('tweenProgress already complete', () => {
    it('returns false immediately when tweenProgress=1', () => {
      const b = makeBubble({ tweenProgress: 1 });
      const result = stepTween(b);
      expect(result).toBe(false);
    });

    it('syncs renderX to x when tweenProgress=1', () => {
      const b = makeBubble({ tweenProgress: 1, x: 200, renderX: 999 });
      stepTween(b);
      expect(b.renderX).toBe(200);
    });

    it('syncs renderY to y when tweenProgress=1', () => {
      const b = makeBubble({ tweenProgress: 1, y: 300, renderY: 999 });
      stepTween(b);
      expect(b.renderY).toBe(300);
    });

    it('syncs renderRadius to radius when tweenProgress=1', () => {
      const b = makeBubble({ tweenProgress: 1, radius: 75, renderRadius: 999 });
      stepTween(b);
      expect(b.renderRadius).toBe(75);
    });
  });

  describe('tween without tweenFrom', () => {
    it('returns true when tweenProgress < 1 and no tweenFrom', () => {
      const b = makeBubble({ tweenProgress: 0, tweenFrom: undefined });
      const result = stepTween(b);
      // tweenProgress advances; unless it reaches 1 in one step it returns true
      // With TWEEN_SPEED=0.05, 0 + 0.05 = 0.05, still active
      expect(result).toBe(true);
    });

    it('sets renderX to x when no tweenFrom', () => {
      const b = makeBubble({ tweenProgress: 0, x: 200, renderX: 0, tweenFrom: undefined });
      stepTween(b);
      expect(b.renderX).toBe(200);
    });
  });

  describe('tween with tweenFrom', () => {
    it('renderX interpolates between tweenFrom.x and x at tweenProgress=0', () => {
      const b = makeBubble({
        tweenProgress: 0,
        x: 200,
        renderX: 0,
        tweenFrom: { x: 0, y: 100, radius: 50 },
      });
      stepTween(b);
      // After one step: progress = 0.05, t = easeInOutCubic(0.05) ≈ small
      // renderX should be between 0 and 200
      expect(b.renderX).toBeGreaterThan(0);
      expect(b.renderX).toBeLessThan(200);
    });

    it('renderY interpolates between tweenFrom.y and y', () => {
      const b = makeBubble({
        tweenProgress: 0,
        y: 300,
        renderY: 100,
        tweenFrom: { x: 100, y: 100, radius: 50 },
      });
      stepTween(b);
      expect(b.renderY).toBeGreaterThan(100);
      expect(b.renderY).toBeLessThan(300);
    });

    it('renderRadius interpolates between tweenFrom.radius and radius', () => {
      const b = makeBubble({
        tweenProgress: 0,
        radius: 80,
        renderRadius: 20,
        tweenFrom: { x: 100, y: 100, radius: 20 },
      });
      stepTween(b);
      expect(b.renderRadius).toBeGreaterThan(20);
      expect(b.renderRadius).toBeLessThan(80);
    });

    it('when tweenProgress reaches 1, renderX/Y/Radius sync exactly to x/y/radius', () => {
      const b = makeBubble({
        tweenProgress: 0.96,  // one TWEEN_SPEED step (0.05) will push it to 1.0
        x: 200,
        y: 300,
        radius: 75,
        tweenFrom: { x: 0, y: 0, radius: 10 },
      });
      const result = stepTween(b);
      expect(result).toBe(false);
      expect(b.renderX).toBe(200);       // exact, no float drift
      expect(b.renderY).toBe(300);
      expect(b.renderRadius).toBe(75);
    });

    it('tween converges to target over 20 steps', () => {
      const b = makeBubble({
        tweenProgress: 0,
        x: 500,
        y: 400,
        radius: 60,
        tweenFrom: { x: 100, y: 100, radius: 20 },
      });
      for (let i = 0; i < 20; i++) {
        const active = stepTween(b);
        if (!active) break;
      }
      expect(b.renderX).toBe(500);
      expect(b.renderY).toBe(400);
      expect(b.renderRadius).toBe(60);
    });

    it('returns true when tween is partway through', () => {
      const b = makeBubble({
        tweenProgress: 0.5,
        x: 200,
        tweenFrom: { x: 0, y: 100, radius: 50 },
      });
      // progress = 0.5 + 0.05 = 0.55, still < 1
      const result = stepTween(b);
      expect(result).toBe(true);
    });
  });

  describe('Easing functions', () => {
    it('Easing.linear(0) === 0', () => {
      expect(Easing.linear(0)).toBe(0);
    });

    it('Easing.linear(1) === 1', () => {
      expect(Easing.linear(1)).toBe(1);
    });

    it('Easing.linear(0.5) === 0.5', () => {
      expect(Easing.linear(0.5)).toBe(0.5);
    });

    it('Easing.easeInOutCubic(0) === 0', () => {
      expect(Easing.easeInOutCubic(0)).toBe(0);
    });

    it('Easing.easeInOutCubic(1) === 1', () => {
      expect(Easing.easeInOutCubic(1)).toBe(1);
    });

    it('custom easing function is used when provided to stepTween', () => {
      const linearB = makeBubble({
        tweenProgress: 0.5,
        x: 200,
        renderX: 0,
        tweenFrom: { x: 0, y: 100, radius: 50 },
      });
      const cubicB = makeBubble({
        tweenProgress: 0.5,
        x: 200,
        renderX: 0,
        tweenFrom: { x: 0, y: 100, radius: 50 },
      });
      stepTween(linearB, Easing.linear);
      stepTween(cubicB, Easing.easeInOutCubic);
      // Linear and cubic produce different renderX values at t=0.55
      expect(linearB.renderX).not.toBeCloseTo(cubicB.renderX, 5);
    });
  });
});

describe('initBubbleTransition', () => {
  it('captures current renderX as tweenFrom.x', () => {
    const b = makeBubble({ renderX: 150 });
    initBubbleTransition(b, 300, 400, 80);
    expect(b.tweenFrom!.x).toBe(150);
  });

  it('captures current renderY as tweenFrom.y', () => {
    const b = makeBubble({ renderY: 250 });
    initBubbleTransition(b, 300, 400, 80);
    expect(b.tweenFrom!.y).toBe(250);
  });

  it('captures current renderRadius as tweenFrom.radius', () => {
    const b = makeBubble({ renderRadius: 40 });
    initBubbleTransition(b, 300, 400, 80);
    expect(b.tweenFrom!.radius).toBe(40);
  });

  it('sets new physics target x', () => {
    const b = makeBubble();
    initBubbleTransition(b, 300, 400, 80);
    expect(b.x).toBe(300);
  });

  it('sets new physics target y', () => {
    const b = makeBubble();
    initBubbleTransition(b, 300, 400, 80);
    expect(b.y).toBe(400);
  });

  it('sets new physics target radius', () => {
    const b = makeBubble();
    initBubbleTransition(b, 300, 400, 80);
    expect(b.radius).toBe(80);
  });

  it('resets tweenProgress to 0', () => {
    const b = makeBubble({ tweenProgress: 1 });
    initBubbleTransition(b, 300, 400, 80);
    expect(b.tweenProgress).toBe(0);
  });

  it('sets shadowDirty to true', () => {
    const b = makeBubble({ shadowDirty: false });
    initBubbleTransition(b, 300, 400, 80);
    expect(b.shadowDirty).toBe(true);
  });
});
