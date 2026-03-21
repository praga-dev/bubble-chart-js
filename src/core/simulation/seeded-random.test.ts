import { seededRandom } from './seeded-random';

describe('seededRandom (mulberry32)', () => {
  describe('determinism', () => {
    it('same seed produces the same first value', () => {
      const r1 = seededRandom(42);
      const r2 = seededRandom(42);
      expect(r1()).toBe(r2());
    });

    it('same seed produces the same sequence of 10 values', () => {
      const r1 = seededRandom(12345);
      const r2 = seededRandom(12345);
      for (let i = 0; i < 10; i++) {
        expect(r1()).toBe(r2());
      }
    });

    it('same seed produces identical sequence of 100 values', () => {
      const seed = 999;
      const r1 = seededRandom(seed);
      const r2 = seededRandom(seed);
      const seq1 = Array.from({ length: 100 }, () => r1());
      const seq2 = Array.from({ length: 100 }, () => r2());
      expect(seq1).toEqual(seq2);
    });
  });

  describe('uniqueness across seeds', () => {
    it('different seeds produce different first values', () => {
      const r1 = seededRandom(1);
      const r2 = seededRandom(2);
      expect(r1()).not.toBe(r2());
    });

    it('different seeds produce different sequences', () => {
      const r1 = seededRandom(100);
      const r2 = seededRandom(200);
      const seq1 = Array.from({ length: 10 }, () => r1());
      const seq2 = Array.from({ length: 10 }, () => r2());
      expect(seq1).not.toEqual(seq2);
    });
  });

  describe('value range', () => {
    it('all values are in [0, 1)', () => {
      const rand = seededRandom(777);
      for (let i = 0; i < 1000; i++) {
        const v = rand();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });

    it('never produces exactly 1', () => {
      const rand = seededRandom(0);
      for (let i = 0; i < 1000; i++) {
        expect(rand()).toBeLessThan(1);
      }
    });

    it('never produces a negative value', () => {
      const rand = seededRandom(55555);
      for (let i = 0; i < 1000; i++) {
        expect(rand()).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('volume and stability', () => {
    it('produces at least 1000 values without throwing', () => {
      const rand = seededRandom(314159);
      expect(() => {
        for (let i = 0; i < 1000; i++) rand();
      }).not.toThrow();
    });

    it('seed=0 produces valid values without throwing', () => {
      const rand = seededRandom(0);
      expect(() => {
        for (let i = 0; i < 100; i++) rand();
      }).not.toThrow();
    });

    it('large seed value produces valid values without throwing', () => {
      const rand = seededRandom(0xffffffff);
      for (let i = 0; i < 100; i++) {
        const v = rand();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });
  });

  describe('randomness quality', () => {
    it('values are not all the same', () => {
      const rand = seededRandom(42);
      const values = Array.from({ length: 100 }, () => rand());
      const unique = new Set(values);
      // A decent PRNG should produce many unique values in 100 draws
      expect(unique.size).toBeGreaterThan(90);
    });

    it('produces both values above and below 0.5', () => {
      const rand = seededRandom(12345);
      const values = Array.from({ length: 100 }, () => rand());
      const above = values.filter(v => v >= 0.5).length;
      const below = values.filter(v => v < 0.5).length;
      expect(above).toBeGreaterThan(0);
      expect(below).toBeGreaterThan(0);
    });

    it('mean of 1000 values is roughly 0.5 (within 0.05)', () => {
      const rand = seededRandom(9999);
      let sum = 0;
      const N = 1000;
      for (let i = 0; i < N; i++) sum += rand();
      const mean = sum / N;
      expect(mean).toBeGreaterThan(0.45);
      expect(mean).toBeLessThan(0.55);
    });
  });
});
