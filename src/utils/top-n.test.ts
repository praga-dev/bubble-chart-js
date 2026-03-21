import { topN } from './top-n';
import { DataItem } from '../models/public/data-item';

function makeItem(id: string, label: string, value: number): DataItem {
  return { id, label, value };
}

describe('topN', () => {
  describe('basic selection', () => {
    it('returns top N items by value descending', () => {
      const data: DataItem[] = [
        makeItem('c', 'Charlie', 10),
        makeItem('a', 'Alpha',   100),
        makeItem('b', 'Beta',    50),
      ];
      const result = topN(data, 2);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('a');
      expect(result[1].id).toBe('b');
    });

    it('returns items ordered by value descending', () => {
      const data: DataItem[] = [
        makeItem('1', 'One',   1),
        makeItem('5', 'Five',  5),
        makeItem('3', 'Three', 3),
        makeItem('2', 'Two',   2),
        makeItem('4', 'Four',  4),
      ];
      const result = topN(data, 5);
      expect(result.map(d => d.value)).toEqual([5, 4, 3, 2, 1]);
    });
  });

  describe('tie-breaking', () => {
    it('breaks ties by label alphabetically ascending', () => {
      const data: DataItem[] = [
        makeItem('z', 'Zebra',  50),
        makeItem('a', 'Apple',  50),
        makeItem('m', 'Mango',  50),
      ];
      const result = topN(data, 3);
      expect(result[0].label).toBe('Apple');
      expect(result[1].label).toBe('Mango');
      expect(result[2].label).toBe('Zebra');
    });

    it('tie-breaking is deterministic across multiple calls', () => {
      const data: DataItem[] = [
        makeItem('z', 'Zebra', 100),
        makeItem('a', 'Apple', 100),
        makeItem('m', 'Mango', 100),
      ];
      const result1 = topN(data, 3);
      const result2 = topN(data, 3);
      expect(result1.map(d => d.id)).toEqual(result2.map(d => d.id));
    });

    it('applies value sort first, then label sort within tied values', () => {
      const data: DataItem[] = [
        makeItem('b1', 'Beta',  50),
        makeItem('a1', 'Alpha', 100),
        makeItem('b2', 'Bravo', 50),
        makeItem('a2', 'Ant',   100),
      ];
      const result = topN(data, 4);
      // Top two should be 100-value items (Alpha, Ant by label order)
      expect(result[0].label).toBe('Alpha');
      expect(result[1].label).toBe('Ant');
      // Bottom two should be 50-value items (Beta, Bravo by label order)
      expect(result[2].label).toBe('Beta');
      expect(result[3].label).toBe('Bravo');
    });
  });

  describe('immutability', () => {
    it('does not mutate the input array', () => {
      const data: DataItem[] = [
        makeItem('c', 'Charlie', 10),
        makeItem('a', 'Alpha',   100),
        makeItem('b', 'Beta',    50),
      ];
      const originalIds = data.map(d => d.id);
      topN(data, 2);
      expect(data.map(d => d.id)).toEqual(originalIds);
    });

    it('does not mutate input array reference', () => {
      const data: DataItem[] = [
        makeItem('a', 'Alpha', 10),
        makeItem('b', 'Beta',  20),
      ];
      const result = topN(data, 1);
      expect(result).not.toBe(data);
    });
  });

  describe('edge cases', () => {
    it('returns empty array when n=0', () => {
      const data: DataItem[] = [
        makeItem('a', 'Alpha', 100),
        makeItem('b', 'Beta',  50),
      ];
      const result = topN(data, 0);
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('returns all items when n > data.length', () => {
      const data: DataItem[] = [
        makeItem('a', 'Alpha', 100),
        makeItem('b', 'Beta',  50),
      ];
      const result = topN(data, 100);
      expect(result).toHaveLength(2);
    });

    it('returns all items when n === data.length', () => {
      const data: DataItem[] = [
        makeItem('a', 'Alpha', 100),
        makeItem('b', 'Beta',  50),
        makeItem('c', 'Gamma', 25),
      ];
      const result = topN(data, 3);
      expect(result).toHaveLength(3);
    });

    it('returns empty array for empty input', () => {
      const result = topN([], 10);
      expect(result).toHaveLength(0);
    });

    it('uses default n=25 when n is not provided', () => {
      const data: DataItem[] = Array.from({ length: 30 }, (_, i) =>
        makeItem(`id${i}`, `Item ${i}`, 30 - i)
      );
      const result = topN(data);
      expect(result).toHaveLength(25);
    });

    it('default n=25 returns top 25 by value', () => {
      const data: DataItem[] = Array.from({ length: 30 }, (_, i) =>
        makeItem(`id${i}`, `Item ${i}`, i + 1)
      );
      const result = topN(data);
      // All results should have value > 5 (items 6 through 30)
      expect(result.every(d => d.value > 5)).toBe(true);
    });
  });
});
