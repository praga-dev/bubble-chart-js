import { StaticLayout } from './static-layout';
import { BubbleState } from '../../models/internal/bubble-state';

function makeBubbleStates(items: Array<{ id: string; label: string; value: number }>): BubbleState[] {
  return items.map(item => ({
    id:           item.id,
    label:        item.label,
    value:        item.value,
    color:        '#3498DB',
    x:            0,
    y:            0,
    radius:       0,
    vx:           0,
    vy:           0,
    renderX:      0,
    renderY:      0,
    renderRadius: 0,
    renderScale:  1,
    targetScale:  1,
    tweenProgress: 1,
    tweenFrom:    undefined,
    shadowDirty:  true,
  }));
}

const WIDTH  = 800;
const HEIGHT = 600;

describe('StaticLayout', () => {
  let layout: StaticLayout;

  beforeEach(() => {
    layout = new StaticLayout();
  });

  describe('single bubble', () => {
    it('positions single bubble near the center (x ≈ width/2)', () => {
      const bubbles = makeBubbleStates([{ id: 'solo', label: 'Solo', value: 100 }]);
      layout.initialize(bubbles, WIDTH, HEIGHT);
      expect(bubbles[0].x).toBeCloseTo(WIDTH / 2, 0);
    });

    it('positions single bubble near the center (y ≈ height/2)', () => {
      const bubbles = makeBubbleStates([{ id: 'solo', label: 'Solo', value: 100 }]);
      layout.initialize(bubbles, WIDTH, HEIGHT);
      expect(bubbles[0].y).toBeCloseTo(HEIGHT / 2, 0);
    });

    it('gives single bubble a positive radius', () => {
      const bubbles = makeBubbleStates([{ id: 'solo', label: 'Solo', value: 100 }]);
      layout.initialize(bubbles, WIDTH, HEIGHT);
      expect(bubbles[0].radius).toBeGreaterThan(0);
    });

    it('keeps single bubble within canvas bounds on x axis', () => {
      const bubbles = makeBubbleStates([{ id: 'solo', label: 'Solo', value: 100 }]);
      layout.initialize(bubbles, WIDTH, HEIGHT);
      const b = bubbles[0];
      expect(b.x - b.radius).toBeGreaterThanOrEqual(0);
      expect(b.x + b.radius).toBeLessThanOrEqual(WIDTH);
    });

    it('keeps single bubble within canvas bounds on y axis', () => {
      const bubbles = makeBubbleStates([{ id: 'solo', label: 'Solo', value: 100 }]);
      layout.initialize(bubbles, WIDTH, HEIGHT);
      const b = bubbles[0];
      expect(b.y - b.radius).toBeGreaterThanOrEqual(0);
      expect(b.y + b.radius).toBeLessThanOrEqual(HEIGHT);
    });
  });

  describe('3 bubbles', () => {
    function getThreeBubbles() {
      return makeBubbleStates([
        { id: 'alpha', label: 'Alpha', value: 100 },
        { id: 'beta',  label: 'Beta',  value: 50  },
        { id: 'gamma', label: 'Gamma', value: 25  },
      ]);
    }

    it('all bubbles have positive radius', () => {
      const bubbles = getThreeBubbles();
      layout.initialize(bubbles, WIDTH, HEIGHT);
      for (const b of bubbles) {
        expect(b.radius).toBeGreaterThan(0);
      }
    });

    it('highest value bubble has the largest radius', () => {
      const bubbles = getThreeBubbles();
      layout.initialize(bubbles, WIDTH, HEIGHT);
      const alpha = bubbles.find(b => b.id === 'alpha')!;
      const beta  = bubbles.find(b => b.id === 'beta')!;
      const gamma = bubbles.find(b => b.id === 'gamma')!;
      expect(alpha.radius).toBeGreaterThanOrEqual(beta.radius);
      expect(beta.radius).toBeGreaterThanOrEqual(gamma.radius);
    });

    it('all bubbles are within canvas bounds on x axis', () => {
      const bubbles = getThreeBubbles();
      layout.initialize(bubbles, WIDTH, HEIGHT);
      for (const b of bubbles) {
        expect(b.x - b.radius).toBeGreaterThanOrEqual(-1);  // allow 1px tolerance for padding
        expect(b.x + b.radius).toBeLessThanOrEqual(WIDTH + 1);
      }
    });

    it('all bubbles are within canvas bounds on y axis', () => {
      const bubbles = getThreeBubbles();
      layout.initialize(bubbles, WIDTH, HEIGHT);
      for (const b of bubbles) {
        expect(b.y - b.radius).toBeGreaterThanOrEqual(-1);
        expect(b.y + b.radius).toBeLessThanOrEqual(HEIGHT + 1);
      }
    });

    it('no two bubbles overlap significantly', () => {
      const bubbles = getThreeBubbles();
      layout.initialize(bubbles, WIDTH, HEIGHT);
      // Allow up to 20% overlap tolerance — the force-directed settling is approximate
      const OVERLAP_TOLERANCE_FACTOR = 0.20;
      for (let i = 0; i < bubbles.length; i++) {
        for (let j = i + 1; j < bubbles.length; j++) {
          const a = bubbles[i];
          const b = bubbles[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          const minDist = a.radius + b.radius;
          expect(dist).toBeGreaterThanOrEqual(minDist * (1 - OVERLAP_TOLERANCE_FACTOR));
        }
      }
    });
  });

  describe('tick()', () => {
    it('always returns false (static layout is always settled)', () => {
      expect(layout.tick()).toBe(false);
    });

    it('returns false before initialize() is called', () => {
      const freshLayout = new StaticLayout();
      expect(freshLayout.tick()).toBe(false);
    });

    it('returns false after initialize() is called', () => {
      const bubbles = makeBubbleStates([{ id: 'a', label: 'A', value: 10 }]);
      layout.initialize(bubbles, WIDTH, HEIGHT);
      expect(layout.tick()).toBe(false);
    });
  });

  describe('state split enforcement', () => {
    it('vx is 0 after initialize (static layout does not use velocity)', () => {
      const bubbles = makeBubbleStates([
        { id: 'a', label: 'A', value: 100 },
        { id: 'b', label: 'B', value: 50  },
      ]);
      layout.initialize(bubbles, WIDTH, HEIGHT);
      for (const b of bubbles) {
        expect(b.vx).toBe(0);
      }
    });

    it('vy is 0 after initialize (static layout does not use velocity)', () => {
      const bubbles = makeBubbleStates([
        { id: 'a', label: 'A', value: 100 },
        { id: 'b', label: 'B', value: 50  },
      ]);
      layout.initialize(bubbles, WIDTH, HEIGHT);
      for (const b of bubbles) {
        expect(b.vy).toBe(0);
      }
    });

    it('renderX is NOT modified by initialize (render field stays at initial 0)', () => {
      const bubbles = makeBubbleStates([{ id: 'a', label: 'A', value: 100 }]);
      // renderX starts at 0
      layout.initialize(bubbles, WIDTH, HEIGHT);
      // x should be updated (physics field), but renderX should remain 0
      expect(bubbles[0].x).not.toBe(0);
      expect(bubbles[0].renderX).toBe(0);
    });

    it('renderY is NOT modified by initialize (render field stays at initial 0)', () => {
      const bubbles = makeBubbleStates([{ id: 'a', label: 'A', value: 100 }]);
      layout.initialize(bubbles, WIDTH, HEIGHT);
      expect(bubbles[0].y).not.toBe(0);
      expect(bubbles[0].renderY).toBe(0);
    });

    it('renderRadius is NOT modified by initialize (render field stays at initial 0)', () => {
      const bubbles = makeBubbleStates([{ id: 'a', label: 'A', value: 100 }]);
      layout.initialize(bubbles, WIDTH, HEIGHT);
      expect(bubbles[0].radius).toBeGreaterThan(0);
      expect(bubbles[0].renderRadius).toBe(0);
    });
  });

  describe('empty bubbles array', () => {
    it('handles empty array without throwing', () => {
      expect(() => layout.initialize([], WIDTH, HEIGHT)).not.toThrow();
    });
  });

  describe('update()', () => {
    it('update() behaves like initialize() (re-positions bubbles)', () => {
      const bubbles = makeBubbleStates([
        { id: 'a', label: 'A', value: 100 },
        { id: 'b', label: 'B', value: 50  },
      ]);
      layout.update(bubbles, WIDTH, HEIGHT);
      for (const b of bubbles) {
        expect(b.radius).toBeGreaterThan(0);
        expect(b.x).toBeGreaterThan(0);
      }
    });
  });

  describe('dispose()', () => {
    it('dispose() does not throw', () => {
      expect(() => layout.dispose()).not.toThrow();
    });
  });
});
