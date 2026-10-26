import { positionBetween } from './position.js';

describe('positionBetween', () => {
  it('creates keys for an empty list and its ends', () => {
    const first = positionBetween(null, null);
    const last = positionBetween(first, null);
    const head = positionBetween(null, first);

    expect([head, first, last]).toEqual([head, first, last].sort());
    expect(new Set([head, first, last]).size).toBe(3);
  });

  it('keeps fitting between neighbours without renumbering', () => {
    const low = positionBetween(null, null);
    let high = positionBetween(low, null);

    for (let i = 0; i < 100; i++) {
      const mid = positionBetween(low, high);
      expect(low < mid && mid < high).toBe(true);
      high = mid;
    }
  });
});
