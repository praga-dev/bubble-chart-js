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

  describe('id validation — throws synchronously', () => {
    it('throws when a DataItem is missing id field entirely', () => {
      const config = makeValidConfig({
        data: [
          { label: 'NoId', value: 100 } as unknown as DataItem,
        ],
      });
      expect(() => validateConfig(config)).toThrow();
    });

    it('throws when a DataItem has empty string id', () => {
      const config = makeValidConfig({
        data: [
          { id: '', label: 'Empty', value: 100 },
        ],
      });
      expect(() => validateConfig(config)).toThrow();
    });

    it('throws when a DataItem has whitespace-only id', () => {
      const config = makeValidConfig({
        data: [
          { id: '   ', label: 'Spaces', value: 100 },
        ],
      });
      expect(() => validateConfig(config)).toThrow();
    });

    it('throws on first occurrence — error message contains index 0 for first bad item', () => {
      const config = makeValidConfig({
        data: [
          { label: 'NoId', value: 100 } as unknown as DataItem,
          { id: 'valid', label: 'Valid', value: 50 },
        ],
      });
      expect(() => validateConfig(config)).toThrow(/index 0/);
    });

    it('throws on first occurrence — error message contains index 1 when first item is valid', () => {
      const config = makeValidConfig({
        data: [
          { id: 'valid', label: 'Valid', value: 50 },
          { label: 'NoId', value: 100 } as unknown as DataItem,
        ],
      });
      expect(() => validateConfig(config)).toThrow(/index 1/);
    });

    it('throws on first bad item even when later items are also bad', () => {
      const config = makeValidConfig({
        data: [
          { label: 'Bad0', value: 10 } as unknown as DataItem,
          { label: 'Bad1', value: 20 } as unknown as DataItem,
          { label: 'Bad2', value: 30 } as unknown as DataItem,
        ],
      });
      // Should throw at index 0, not index 1 or 2
      expect(() => validateConfig(config)).toThrow(/index 0/);
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
