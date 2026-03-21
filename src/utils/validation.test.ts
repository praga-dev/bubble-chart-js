import { validateConfig, resolveRenderer } from './validation';
import { Configuration } from '../models/public/configuration';
import { DataItem } from '../models/public/data-item';

function makeValidConfig(overrides: Partial<Configuration> = {}): Configuration {
  return {
    canvasContainerId: 'chart',
    data: [
      { id: 'a', label: 'Alpha', value: 100 },
      { id: 'b', label: 'Beta',  value: 50  },
    ],
    ...overrides,
  } as Configuration;
}

describe('validateConfig', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('null / undefined guard', () => {
    it('returns false for null config', () => {
      const result = validateConfig(null as unknown as Configuration);
      expect(result).toBe(false);
    });

    it('returns false for undefined config', () => {
      const result = validateConfig(undefined as unknown as Configuration);
      expect(result).toBe(false);
    });
  });

  describe('data validation', () => {
    it('returns false for empty data array', () => {
      const result = validateConfig(makeValidConfig({ data: [] }));
      expect(result).toBe(false);
    });

    it('returns false when data is not an array', () => {
      const result = validateConfig(makeValidConfig({ data: null as unknown as DataItem[] }));
      expect(result).toBe(false);
    });
  });

  describe('id auto-derivation', () => {
    let warnSpy: jest.SpyInstance;
    beforeEach(() => { warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {}); });
    afterEach(() => { warnSpy.mockRestore(); });

    it('auto-derives id from label when labels are unique', () => {
      const config = makeValidConfig({
        data: [
          { label: 'Alpha', value: 100 } as unknown as DataItem,
          { label: 'Beta',  value: 50  } as unknown as DataItem,
        ],
      });
      validateConfig(config);
      expect(config.data[0].id).toBe('Alpha');
      expect(config.data[1].id).toBe('Beta');
    });

    it('auto-derives id from label+value when labels are not unique', () => {
      const config = makeValidConfig({
        data: [
          { label: 'Item', value: 100 } as unknown as DataItem,
          { label: 'Item', value: 50  } as unknown as DataItem,
        ],
      });
      validateConfig(config);
      expect(config.data[0].id).toBe('Item100');
      expect(config.data[1].id).toBe('Item50');
    });

    it('emits a console.warn once when any id is missing', () => {
      const config = makeValidConfig({
        data: [
          { label: 'A', value: 1 } as unknown as DataItem,
          { label: 'B', value: 2 } as unknown as DataItem,
          { label: 'C', value: 3 } as unknown as DataItem,
        ],
      });
      validateConfig(config);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('does not warn when all items have explicit ids', () => {
      const config = makeValidConfig();
      validateConfig(config);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('auto-derives only items missing id, leaves explicit ids untouched', () => {
      const config = makeValidConfig({
        data: [
          { id: 'explicit', label: 'Alpha', value: 100 },
          { label: 'Beta', value: 50 } as unknown as DataItem,
        ],
      });
      validateConfig(config);
      expect(config.data[0].id).toBe('explicit');
      expect(config.data[1].id).toBe('Beta');
    });

    it('auto-derives id from label when id is empty string', () => {
      const config = makeValidConfig({
        data: [{ id: '', label: 'Empty', value: 10 }],
      });
      validateConfig(config);
      expect(config.data[0].id).toBe('Empty');
    });

    it('auto-derives id from label when id is whitespace-only', () => {
      const config = makeValidConfig({
        data: [{ id: '   ', label: 'Spaces', value: 10 }],
      });
      validateConfig(config);
      expect(config.data[0].id).toBe('Spaces');
    });
  });

  describe('valid config', () => {
    it('returns true for valid config with all required fields', () => {
      const result = validateConfig(makeValidConfig());
      expect(result).toBe(true);
    });

    it('returns true for single valid DataItem', () => {
      const result = validateConfig(makeValidConfig({
        data: [{ id: 'solo', label: 'Solo', value: 100 }],
      }));
      expect(result).toBe(true);
    });
  });
});

describe('resolveRenderer', () => {
  describe('explicit modes', () => {
    it('returns "svg" when mode is "svg" regardless of dataLength', () => {
      expect(resolveRenderer(0,   'svg')).toBe('svg');
      expect(resolveRenderer(25,  'svg')).toBe('svg');
      expect(resolveRenderer(100, 'svg')).toBe('svg');
    });

    it('returns "canvas" when mode is "canvas" regardless of dataLength', () => {
      expect(resolveRenderer(0,   'canvas')).toBe('canvas');
      expect(resolveRenderer(1,   'canvas')).toBe('canvas');
      expect(resolveRenderer(100, 'canvas')).toBe('canvas');
    });
  });

  describe('auto mode', () => {
    it('returns "svg" for dataLength <= 25 in auto mode', () => {
      expect(resolveRenderer(1,  'auto')).toBe('svg');
      expect(resolveRenderer(10, 'auto')).toBe('svg');
      expect(resolveRenderer(24, 'auto')).toBe('svg');
    });

    it('returns "canvas" for dataLength > 25 in auto mode', () => {
      expect(resolveRenderer(26,  'auto')).toBe('canvas');
      expect(resolveRenderer(50,  'auto')).toBe('canvas');
      expect(resolveRenderer(100, 'auto')).toBe('canvas');
    });

    it('returns "svg" at exactly 25 items in auto mode', () => {
      expect(resolveRenderer(25, 'auto')).toBe('svg');
    });

    it('returns "canvas" at exactly 26 items in auto mode', () => {
      expect(resolveRenderer(26, 'auto')).toBe('canvas');
    });
  });
});
