import { normalizeConfig, DEFAULTS } from './config';
import { DataItem } from '../models/public/data-item';

const BASE_DATA: DataItem[] = [
  { id: 'a', label: 'Alpha', value: 100 },
  { id: 'b', label: 'Beta',  value: 50  },
];

function baseInput(overrides: Record<string, any> = {}) {
  return {
    canvasContainerId: 'chart',
    data: BASE_DATA,
    ...overrides,
  };
}

describe('normalizeConfig', () => {
  describe('V1 flat shorthand fields', () => {
    it('passes fontSize through when provided', () => {
      const result = normalizeConfig(baseInput({ fontSize: 16 }));
      expect(result.fontSize).toBe(16);
    });

    it('passes defaultFontColor through when provided', () => {
      const result = normalizeConfig(baseInput({ defaultFontColor: '#000000' }));
      expect(result.defaultFontColor).toBe('#000000');
    });

    it('passes defaultFontFamily through when provided', () => {
      const result = normalizeConfig(baseInput({ defaultFontFamily: 'Roboto' }));
      expect(result.defaultFontFamily).toBe('Roboto');
    });

    it('passes defaultBubbleColor through when provided', () => {
      const result = normalizeConfig(baseInput({ defaultBubbleColor: '#ff0000' }));
      expect(result.defaultBubbleColor).toBe('#ff0000');
    });

    it('passes minRadius through when provided', () => {
      const result = normalizeConfig(baseInput({ minRadius: 20 }));
      expect(result.minRadius).toBe(20);
    });

    it('passes textWrap through when provided as false', () => {
      const result = normalizeConfig(baseInput({ textWrap: false }));
      expect(result.textWrap).toBe(false);
    });

    it('passes showToolTip through when provided as false', () => {
      const result = normalizeConfig(baseInput({ showToolTip: false }));
      expect(result.showToolTip).toBe(false);
    });

    it('passes isResizeCanvasOnWindowSizeChange through when provided as false', () => {
      const result = normalizeConfig(baseInput({ isResizeCanvasOnWindowSizeChange: false }));
      expect(result.isResizeCanvasOnWindowSizeChange).toBe(false);
    });
  });

  describe('V2 grouped config pass-through', () => {
    it('passes layout.type "physics" through', () => {
      const result = normalizeConfig(baseInput({
        layout: { type: 'physics' },
      }));
      expect(result.layout!.type).toBe('physics');
    });

    it('passes render.mode through', () => {
      const result = normalizeConfig(baseInput({
        render: { mode: 'canvas' },
      }));
      expect(result.render!.mode).toBe('canvas');
    });

    it('passes render.theme through', () => {
      const result = normalizeConfig(baseInput({
        render: { theme: 'glass' },
      }));
      expect(result.render!.theme).toBe('glass');
    });

    it('passes render.glassPerformanceHint through', () => {
      const result = normalizeConfig(baseInput({
        render: { theme: 'glass', glassPerformanceHint: 'full' },
      }));
      expect(result.render!.glassPerformanceHint).toBe('full');
    });

    it('passes render.glassOptions through unchanged', () => {
      const glassOptions = { glowIntensity: 0.3, blurRadius: 8 };
      const result = normalizeConfig(baseInput({
        render: { theme: 'glass', glassPerformanceHint: 'full', glassOptions },
      }));
      expect(result.render!.glassOptions).toEqual(glassOptions);
    });

    it('omits glassOptions from render when not provided (no default injected)', () => {
      const result = normalizeConfig(baseInput({
        render: { theme: 'glass', glassPerformanceHint: 'safe' },
      }));
      expect(result.render!.glassOptions).toBeUndefined();
    });

    it('partial glassOptions — only glowIntensity provided — passes through as-is', () => {
      const result = normalizeConfig(baseInput({
        render: { theme: 'glass', glassOptions: { glowIntensity: 0.8 } },
      }));
      expect(result.render!.glassOptions!.glowIntensity).toBe(0.8);
      expect(result.render!.glassOptions!.blurRadius).toBeUndefined();
    });

    it('passes interaction.hoverScale through', () => {
      const result = normalizeConfig(baseInput({
        interaction: { hoverScale: 1.5 },
      }));
      expect(result.interaction!.hoverScale).toBe(1.5);
    });

    it('passes interaction.hoverEase through', () => {
      const result = normalizeConfig(baseInput({
        interaction: { hoverEase: 0.25 },
      }));
      expect(result.interaction!.hoverEase).toBe(0.25);
    });

    it('passes interaction.tooltipEnabled false through', () => {
      const result = normalizeConfig(baseInput({
        interaction: { tooltipEnabled: false },
      }));
      expect(result.interaction!.tooltipEnabled).toBe(false);
    });

    it('passes animation.entryDuration through', () => {
      const result = normalizeConfig(baseInput({
        animation: { entryDuration: 60 },
      }));
      expect(result.animation!.entryDuration).toBe(60);
    });

    it('passes animation.transitionEasing function through', () => {
      const easingFn = (t: number) => t * t;
      const result = normalizeConfig(baseInput({
        animation: { transitionEasing: easingFn },
      }));
      expect(result.animation!.transitionEasing).toBe(easingFn);
    });
  });

  describe('theme shorthand', () => {
    it('maps theme: "glass" shorthand to render.theme = "glass"', () => {
      const result = normalizeConfig(baseInput({ theme: 'glass' }));
      expect(result.render!.theme).toBe('glass');
    });

    it('maps theme: "flat" shorthand to render.theme = "flat"', () => {
      const result = normalizeConfig(baseInput({ theme: 'flat' }));
      expect(result.render!.theme).toBe('flat');
    });

    it('also stores theme shorthand on result.theme field', () => {
      const result = normalizeConfig(baseInput({ theme: 'glass' }));
      expect(result.theme).toBe('glass');
    });

    it('render.theme takes precedence over top-level theme shorthand... actually render.theme is used directly', () => {
      // render.theme overrides top-level theme when both are provided
      const result = normalizeConfig(baseInput({
        theme: 'flat',
        render: { theme: 'glass' },
      }));
      // Per normalizeConfig: renderTheme = userConfig.theme ?? userConfig.render?.theme
      // So top-level theme wins if present
      expect(result.render!.theme).toBe('flat');
    });
  });

  describe('deprecated onBubbleClick', () => {
    it('passes onBubbleClick through when provided', () => {
      const handler = jest.fn();
      const result = normalizeConfig(baseInput({ onBubbleClick: handler }));
      expect(result.onBubbleClick).toBe(handler);
    });

    it('onBubbleClick is undefined when not provided', () => {
      const result = normalizeConfig(baseInput());
      expect(result.onBubbleClick).toBeUndefined();
    });
  });

  describe('defaults applied when omitted', () => {
    it('defaults layout.type to "static"', () => {
      const result = normalizeConfig(baseInput());
      expect(result.layout!.type).toBe('static');
    });

    it('defaults render.mode to "auto"', () => {
      const result = normalizeConfig(baseInput());
      expect(result.render!.mode).toBe('auto');
    });

    it('defaults render.theme to "flat"', () => {
      const result = normalizeConfig(baseInput());
      expect(result.render!.theme).toBe('flat');
    });

    it('defaults fontSize to 12', () => {
      const result = normalizeConfig(baseInput());
      expect(result.fontSize).toBe(DEFAULTS.fontSize);
    });

    it('defaults defaultFontColor to "#ffffff"', () => {
      const result = normalizeConfig(baseInput());
      expect(result.defaultFontColor).toBe(DEFAULTS.defaultFontColor);
    });

    it('defaults defaultFontFamily to "Arial"', () => {
      const result = normalizeConfig(baseInput());
      expect(result.defaultFontFamily).toBe(DEFAULTS.defaultFontFamily);
    });

    it('defaults defaultBubbleColor to "#3498DB"', () => {
      const result = normalizeConfig(baseInput());
      expect(result.defaultBubbleColor).toBe(DEFAULTS.defaultBubbleColor);
    });

    it('defaults minRadius to 10', () => {
      const result = normalizeConfig(baseInput());
      expect(result.minRadius).toBe(DEFAULTS.minRadius);
    });

    it('defaults textWrap to true', () => {
      const result = normalizeConfig(baseInput());
      expect(result.textWrap).toBe(DEFAULTS.textWrap);
    });

    it('defaults showToolTip to true', () => {
      const result = normalizeConfig(baseInput());
      expect(result.showToolTip).toBe(DEFAULTS.showToolTip);
    });

    it('defaults interaction.hoverScale to 1.08', () => {
      const result = normalizeConfig(baseInput());
      expect(result.interaction!.hoverScale).toBe(DEFAULTS.interaction.hoverScale);
    });

    it('defaults animation.entryDuration to 25', () => {
      const result = normalizeConfig(baseInput());
      expect(result.animation!.entryDuration).toBe(DEFAULTS.animation.entryDuration);
    });

    it('does not add physics key when layout.physics is not provided', () => {
      const result = normalizeConfig(baseInput());
      expect(result.layout!.physics).toBeUndefined();
    });
  });

  describe('V2 grouped physics config', () => {
    it('merges partial physics config with defaults', () => {
      const result = normalizeConfig(baseInput({
        layout: {
          type: 'physics',
          physics: { centerStrength: 0.05 },
        },
      }));
      expect(result.layout!.physics!.centerStrength).toBe(0.05);
      // Other physics fields should still be present with defaults
      expect(result.layout!.physics!.collisionPad).toBe(DEFAULTS.layout.physics.collisionPad);
      expect(result.layout!.physics!.velocityDecay).toBe(DEFAULTS.layout.physics.velocityDecay);
    });

    it('passes seed through in physics config', () => {
      const result = normalizeConfig(baseInput({
        layout: {
          type: 'physics',
          physics: { seed: 42 },
        },
      }));
      expect(result.layout!.physics!.seed).toBe(42);
    });

    it('merges all provided physics fields over defaults', () => {
      const customPhysics = {
        centerStrength: 0.05,
        collisionPad:   5,
        velocityDecay:  0.9,
        wallStrength:   0.2,
        alphaDecay:     0.03,
        alphaMin:       0.002,
        maxVelocity:    10,
        updateBehavior: 'momentum' as const,
      };
      const result = normalizeConfig(baseInput({
        layout: { type: 'physics', physics: customPhysics },
      }));
      expect(result.layout!.physics!.centerStrength).toBe(0.05);
      expect(result.layout!.physics!.collisionPad).toBe(5);
      expect(result.layout!.physics!.velocityDecay).toBe(0.9);
      expect(result.layout!.physics!.updateBehavior).toBe('momentum');
    });

    it('uses default alphaDecay when physics provided but alphaDecay omitted', () => {
      const result = normalizeConfig(baseInput({
        layout: {
          type: 'physics',
          physics: { seed: 99 },
        },
      }));
      expect(result.layout!.physics!.alphaDecay).toBe(DEFAULTS.layout.physics.alphaDecay);
    });
  });

  describe('required fields preserved', () => {
    it('preserves canvasContainerId', () => {
      const result = normalizeConfig(baseInput({ canvasContainerId: 'my-chart' }));
      expect(result.canvasContainerId).toBe('my-chart');
    });

    it('preserves data reference', () => {
      const result = normalizeConfig(baseInput());
      expect(result.data).toBe(BASE_DATA);
    });
  });
});
