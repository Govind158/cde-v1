/**
 * Rule Evaluator — Core criteria evaluation engine (ALL/ANY/NONE)
 * Evaluates MatchCriteria against a FactStore using dot-notation field paths.
 */

import type { MatchCriteria, CriterionItem, FactStore } from '@/types/cde';

/**
 * Resolve a dot-notation path against an object.
 * Returns undefined if any segment is missing.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const segments = path.split('.');
  let current: unknown = obj;

  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

/**
 * Case-insensitive string comparison.
 */
function strEquals(a: unknown, b: unknown): boolean {
  if (typeof a === 'string' && typeof b === 'string') {
    return a.toLowerCase() === b.toLowerCase();
  }
  return a === b;
}

/**
 * Evaluate a single criterion against the fact store.
 */
export function evaluateSingleCriterion(
  criterion: CriterionItem,
  facts: FactStore
): boolean {
  const value = getNestedValue(facts as unknown as Record<string, unknown>, criterion.field);

  // Handle exists / notExists first (they don't need the field value)
  if (criterion.exists === true) {
    return value !== null && value !== undefined;
  }
  if (criterion.notExists === true) {
    return value === null || value === undefined;
  }

  // For all other operators, if field doesn't exist, return false
  if (value === null || value === undefined) {
    return false;
  }

  // equals
  if (criterion.equals !== undefined) {
    return strEquals(value, criterion.equals);
  }

  // contains — value should be in an array
  if (criterion.contains !== undefined) {
    if (Array.isArray(value)) {
      return value.some((v) => strEquals(v, criterion.contains));
    }
    return strEquals(value, criterion.contains);
  }

  // containsAny — any value from the list exists in the array
  if (criterion.containsAny !== undefined) {
    if (Array.isArray(value)) {
      return criterion.containsAny.some((item) =>
        value.some((v) => strEquals(v, item))
      );
    }
    return criterion.containsAny.some((item) => strEquals(value, item));
  }

  // lessThan
  if (criterion.lessThan !== undefined) {
    return typeof value === 'number' && value < criterion.lessThan;
  }

  // greaterThan
  if (criterion.greaterThan !== undefined) {
    return typeof value === 'number' && value > criterion.greaterThan;
  }

  // between
  if (criterion.between !== undefined) {
    const [min, max] = criterion.between;
    return typeof value === 'number' && value >= min && value <= max;
  }

  return false;
}

/**
 * Evaluate a complete MatchCriteria (ALL/ANY/NONE) against the fact store.
 */
export function evaluateCriteria(
  criteria: MatchCriteria,
  facts: FactStore
): boolean {
  // ALL: every criterion must match
  if (criteria.ALL) {
    const allMatch = criteria.ALL.every((c) => evaluateSingleCriterion(c, facts));
    if (!allMatch) return false;
  }

  // ANY: at least one must match
  if (criteria.ANY) {
    const anyMatch = criteria.ANY.some((c) => evaluateSingleCriterion(c, facts));
    if (!anyMatch) return false;
  }

  // NONE: no criterion must match
  if (criteria.NONE) {
    const noneMatch = criteria.NONE.every((c) => !evaluateSingleCriterion(c, facts));
    if (!noneMatch) return false;
  }

  return true;
}
