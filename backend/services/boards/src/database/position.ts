import { generateKeyBetween } from 'fractional-indexing';

/**
 * Ordering key for columns/cards: a string strictly between `before` and `after`
 * (null = list start/end). Moving an item rewrites only its own key, so a move is a
 * single-row update and a single event. Keys compare by bytes — the columns use
 * `COLLATE "C"`, so ORDER BY matches JS string comparison.
 */
export function positionBetween(
  before: string | null,
  after: string | null,
): string {
  return generateKeyBetween(before, after);
}
