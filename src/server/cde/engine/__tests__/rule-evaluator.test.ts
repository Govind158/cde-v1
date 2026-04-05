/**
 * Rule Evaluator Tests — 55+ test cases
 */

import { describe, it, expect } from 'vitest';
import { evaluateCriteria, evaluateSingleCriterion } from '../rule-evaluator';
import type { FactStore, CriterionItem, MatchCriteria } from '@/types/cde';
import { createDefaultFactStore } from '@/types/cde';

function makeFacts(overrides: Partial<FactStore> = {}): FactStore {
  return { ...createDefaultFactStore(), ...overrides };
}

// ─────────────────────────────────────────────
// EQUALS operator (5 tests)
// ─────────────────────────────────────────────
describe('equals operator', () => {
  it('matches exact string value', () => {
    const facts = makeFacts({ bodyRegion: 'lumbar_spine' });
    expect(evaluateSingleCriterion({ field: 'bodyRegion', equals: 'lumbar_spine' }, facts)).toBe(true);
  });

  it('is case-insensitive for strings', () => {
    const facts = makeFacts({ bodyRegion: 'Lumbar_Spine' });
    expect(evaluateSingleCriterion({ field: 'bodyRegion', equals: 'lumbar_spine' }, facts)).toBe(true);
  });

  it('matches numeric value', () => {
    const facts = makeFacts({ severity: 7 });
    expect(evaluateSingleCriterion({ field: 'severity', equals: 7 }, facts)).toBe(true);
  });

  it('returns false for non-match', () => {
    const facts = makeFacts({ bodyRegion: 'cervical' });
    expect(evaluateSingleCriterion({ field: 'bodyRegion', equals: 'lumbar_spine' }, facts)).toBe(false);
  });

  it('matches boolean values', () => {
    const facts = makeFacts({ numbness: true });
    expect(evaluateSingleCriterion({ field: 'numbness', equals: true }, facts)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// CONTAINS operator (5 tests)
// ─────────────────────────────────────────────
describe('contains operator', () => {
  it('finds value in array', () => {
    const facts = makeFacts({ aggravatingFactors: ['sitting', 'bending'] });
    expect(evaluateSingleCriterion({ field: 'aggravatingFactors', contains: 'sitting' }, facts)).toBe(true);
  });

  it('returns false when value not in array', () => {
    const facts = makeFacts({ aggravatingFactors: ['sitting'] });
    expect(evaluateSingleCriterion({ field: 'aggravatingFactors', contains: 'walking' }, facts)).toBe(false);
  });

  it('is case-insensitive', () => {
    const facts = makeFacts({ aggravatingFactors: ['Sitting'] });
    expect(evaluateSingleCriterion({ field: 'aggravatingFactors', contains: 'sitting' }, facts)).toBe(true);
  });

  it('works on scalar values', () => {
    const facts = makeFacts({ radiation: 'below_knee' });
    expect(evaluateSingleCriterion({ field: 'radiation', contains: 'below_knee' }, facts)).toBe(true);
  });

  it('returns false on empty array', () => {
    const facts = makeFacts({ aggravatingFactors: [] });
    expect(evaluateSingleCriterion({ field: 'aggravatingFactors', contains: 'sitting' }, facts)).toBe(false);
  });
});

// ─────────────────────────────────────────────
// CONTAINSANY operator (5 tests)
// ─────────────────────────────────────────────
describe('containsAny operator', () => {
  it('matches when one item is present', () => {
    const facts = makeFacts({ aggravatingFactors: ['sitting', 'walking'] });
    expect(evaluateSingleCriterion({ field: 'aggravatingFactors', containsAny: ['running', 'sitting'] }, facts)).toBe(true);
  });

  it('matches when multiple items are present', () => {
    const facts = makeFacts({ aggravatingFactors: ['sitting', 'standing', 'walking'] });
    expect(evaluateSingleCriterion({ field: 'aggravatingFactors', containsAny: ['sitting', 'walking'] }, facts)).toBe(true);
  });

  it('returns false when none present', () => {
    const facts = makeFacts({ aggravatingFactors: ['sitting'] });
    expect(evaluateSingleCriterion({ field: 'aggravatingFactors', containsAny: ['running', 'jumping'] }, facts)).toBe(false);
  });

  it('is case-insensitive', () => {
    const facts = makeFacts({ aggravatingFactors: ['SITTING'] });
    expect(evaluateSingleCriterion({ field: 'aggravatingFactors', containsAny: ['sitting'] }, facts)).toBe(true);
  });

  it('works on scalar values', () => {
    const facts = makeFacts({ duration: 'chronic_over_12_weeks' });
    expect(evaluateSingleCriterion({ field: 'duration', containsAny: ['acute_0_6_weeks', 'chronic_over_12_weeks'] }, facts)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// LESSTHAN operator (5 tests)
// ─────────────────────────────────────────────
describe('lessThan operator', () => {
  it('returns true when value is less', () => {
    const facts = makeFacts({ severity: 3 });
    expect(evaluateSingleCriterion({ field: 'severity', lessThan: 5 }, facts)).toBe(true);
  });

  it('returns false when value equals threshold', () => {
    const facts = makeFacts({ severity: 5 });
    expect(evaluateSingleCriterion({ field: 'severity', lessThan: 5 }, facts)).toBe(false);
  });

  it('returns false when value is greater', () => {
    const facts = makeFacts({ severity: 8 });
    expect(evaluateSingleCriterion({ field: 'severity', lessThan: 5 }, facts)).toBe(false);
  });

  it('works with nested paths', () => {
    const facts = makeFacts();
    facts.functionalImpact.sleep = 1;
    expect(evaluateSingleCriterion({ field: 'functionalImpact.sleep', lessThan: 2 }, facts)).toBe(true);
  });

  it('returns false for non-numeric values', () => {
    const facts = makeFacts({ bodyRegion: 'lumbar' });
    expect(evaluateSingleCriterion({ field: 'bodyRegion', lessThan: 5 }, facts)).toBe(false);
  });
});

// ─────────────────────────────────────────────
// GREATERTHAN operator (5 tests)
// ─────────────────────────────────────────────
describe('greaterThan operator', () => {
  it('returns true when value is greater', () => {
    const facts = makeFacts({ severity: 8 });
    expect(evaluateSingleCriterion({ field: 'severity', greaterThan: 5 }, facts)).toBe(true);
  });

  it('returns false when value equals threshold', () => {
    const facts = makeFacts({ severity: 5 });
    expect(evaluateSingleCriterion({ field: 'severity', greaterThan: 5 }, facts)).toBe(false);
  });

  it('returns false when value is less', () => {
    const facts = makeFacts({ severity: 2 });
    expect(evaluateSingleCriterion({ field: 'severity', greaterThan: 5 }, facts)).toBe(false);
  });

  it('works with age field', () => {
    const facts = makeFacts({ age: 55 });
    expect(evaluateSingleCriterion({ field: 'age', greaterThan: 50 }, facts)).toBe(true);
  });

  it('works with zero', () => {
    const facts = makeFacts({ severity: 0 });
    expect(evaluateSingleCriterion({ field: 'severity', greaterThan: 0 }, facts)).toBe(false);
  });
});

// ─────────────────────────────────────────────
// BETWEEN operator (5 tests)
// ─────────────────────────────────────────────
describe('between operator', () => {
  it('returns true when value is within range', () => {
    const facts = makeFacts({ severity: 5 });
    expect(evaluateSingleCriterion({ field: 'severity', between: [3, 7] }, facts)).toBe(true);
  });

  it('returns true at lower bound (inclusive)', () => {
    const facts = makeFacts({ severity: 3 });
    expect(evaluateSingleCriterion({ field: 'severity', between: [3, 7] }, facts)).toBe(true);
  });

  it('returns true at upper bound (inclusive)', () => {
    const facts = makeFacts({ severity: 7 });
    expect(evaluateSingleCriterion({ field: 'severity', between: [3, 7] }, facts)).toBe(true);
  });

  it('returns false below range', () => {
    const facts = makeFacts({ severity: 1 });
    expect(evaluateSingleCriterion({ field: 'severity', between: [3, 7] }, facts)).toBe(false);
  });

  it('returns false above range', () => {
    const facts = makeFacts({ severity: 9 });
    expect(evaluateSingleCriterion({ field: 'severity', between: [3, 7] }, facts)).toBe(false);
  });
});

// ─────────────────────────────────────────────
// EXISTS operator (5 tests)
// ─────────────────────────────────────────────
describe('exists operator', () => {
  it('returns true when field has a value', () => {
    const facts = makeFacts({ bodyRegion: 'lumbar_spine' });
    expect(evaluateSingleCriterion({ field: 'bodyRegion', exists: true }, facts)).toBe(true);
  });

  it('returns false when field is null', () => {
    const facts = makeFacts({ bodyRegion: null });
    expect(evaluateSingleCriterion({ field: 'bodyRegion', exists: true }, facts)).toBe(false);
  });

  it('returns true for zero (falsy but exists)', () => {
    const facts = makeFacts({ severity: 0 });
    expect(evaluateSingleCriterion({ field: 'severity', exists: true }, facts)).toBe(true);
  });

  it('returns true for false boolean', () => {
    const facts = makeFacts({ numbness: false });
    expect(evaluateSingleCriterion({ field: 'numbness', exists: true }, facts)).toBe(true);
  });

  it('returns false for undefined nested path', () => {
    const facts = makeFacts();
    expect(evaluateSingleCriterion({ field: 'imaging.finding', exists: true }, facts)).toBe(false);
  });
});

// ─────────────────────────────────────────────
// NOTEXISTS operator (5 tests)
// ─────────────────────────────────────────────
describe('notExists operator', () => {
  it('returns true when field is null', () => {
    const facts = makeFacts({ bodyRegion: null });
    expect(evaluateSingleCriterion({ field: 'bodyRegion', notExists: true }, facts)).toBe(true);
  });

  it('returns false when field has value', () => {
    const facts = makeFacts({ bodyRegion: 'lumbar' });
    expect(evaluateSingleCriterion({ field: 'bodyRegion', notExists: true }, facts)).toBe(false);
  });

  it('returns true for completely missing path', () => {
    const facts = makeFacts();
    expect(evaluateSingleCriterion({ field: 'nonexistent.path', notExists: true }, facts)).toBe(true);
  });

  it('returns false for zero', () => {
    const facts = makeFacts({ severity: 0 });
    expect(evaluateSingleCriterion({ field: 'severity', notExists: true }, facts)).toBe(false);
  });

  it('returns false for empty string', () => {
    const facts = makeFacts({ bodyRegion: '' });
    // empty string is not null/undefined
    expect(evaluateSingleCriterion({ field: 'bodyRegion', notExists: true }, facts)).toBe(false);
  });
});

// ─────────────────────────────────────────────
// ALL combinator (5 tests)
// ─────────────────────────────────────────────
describe('ALL combinator', () => {
  it('returns true when all criteria match', () => {
    const facts = makeFacts({ severity: 7, bodyRegion: 'lumbar_spine' });
    const criteria: MatchCriteria = {
      ALL: [
        { field: 'severity', greaterThan: 5 },
        { field: 'bodyRegion', equals: 'lumbar_spine' },
      ],
    };
    expect(evaluateCriteria(criteria, facts)).toBe(true);
  });

  it('returns false when one criterion fails', () => {
    const facts = makeFacts({ severity: 3, bodyRegion: 'lumbar_spine' });
    const criteria: MatchCriteria = {
      ALL: [
        { field: 'severity', greaterThan: 5 },
        { field: 'bodyRegion', equals: 'lumbar_spine' },
      ],
    };
    expect(evaluateCriteria(criteria, facts)).toBe(false);
  });

  it('returns true with empty ALL array', () => {
    const facts = makeFacts();
    expect(evaluateCriteria({ ALL: [] }, facts)).toBe(true);
  });

  it('works with nested fields', () => {
    const facts = makeFacts();
    facts.functionalImpact.adl = 3;
    facts.functionalImpact.sleep = 2;
    const criteria: MatchCriteria = {
      ALL: [
        { field: 'functionalImpact.adl', greaterThan: 2 },
        { field: 'functionalImpact.sleep', greaterThan: 1 },
      ],
    };
    expect(evaluateCriteria(criteria, facts)).toBe(true);
  });

  it('handles single criterion', () => {
    const facts = makeFacts({ severity: 8 });
    expect(evaluateCriteria({ ALL: [{ field: 'severity', greaterThan: 5 }] }, facts)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// ANY combinator (5 tests)
// ─────────────────────────────────────────────
describe('ANY combinator', () => {
  it('returns true when one criterion matches', () => {
    const facts = makeFacts({ severity: 3, bodyRegion: 'lumbar_spine' });
    const criteria: MatchCriteria = {
      ANY: [
        { field: 'severity', greaterThan: 5 },
        { field: 'bodyRegion', equals: 'lumbar_spine' },
      ],
    };
    expect(evaluateCriteria(criteria, facts)).toBe(true);
  });

  it('returns false when no criteria match', () => {
    const facts = makeFacts({ severity: 3, bodyRegion: 'cervical' });
    const criteria: MatchCriteria = {
      ANY: [
        { field: 'severity', greaterThan: 5 },
        { field: 'bodyRegion', equals: 'lumbar_spine' },
      ],
    };
    expect(evaluateCriteria(criteria, facts)).toBe(false);
  });

  it('returns true when all match', () => {
    const facts = makeFacts({ severity: 8, bodyRegion: 'lumbar_spine' });
    const criteria: MatchCriteria = {
      ANY: [
        { field: 'severity', greaterThan: 5 },
        { field: 'bodyRegion', equals: 'lumbar_spine' },
      ],
    };
    expect(evaluateCriteria(criteria, facts)).toBe(true);
  });

  it('returns false with empty ANY array', () => {
    const facts = makeFacts();
    expect(evaluateCriteria({ ANY: [] }, facts)).toBe(false);
  });

  it('works with contains operator', () => {
    const facts = makeFacts({ aggravatingFactors: ['sitting'] });
    const criteria: MatchCriteria = {
      ANY: [
        { field: 'aggravatingFactors', contains: 'running' },
        { field: 'aggravatingFactors', contains: 'sitting' },
      ],
    };
    expect(evaluateCriteria(criteria, facts)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// NONE combinator (5 tests)
// ─────────────────────────────────────────────
describe('NONE combinator', () => {
  it('returns true when no criteria match', () => {
    const facts = makeFacts({ severity: 3 });
    const criteria: MatchCriteria = {
      NONE: [
        { field: 'severity', greaterThan: 5 },
        { field: 'bodyRegion', equals: 'cervical' },
      ],
    };
    expect(evaluateCriteria(criteria, facts)).toBe(true);
  });

  it('returns false when one criterion matches', () => {
    const facts = makeFacts({ severity: 8 });
    const criteria: MatchCriteria = {
      NONE: [{ field: 'severity', greaterThan: 5 }],
    };
    expect(evaluateCriteria(criteria, facts)).toBe(false);
  });

  it('returns true with empty NONE array', () => {
    const facts = makeFacts();
    expect(evaluateCriteria({ NONE: [] }, facts)).toBe(true);
  });

  it('works with exists check', () => {
    const facts = makeFacts({ bodyRegion: null });
    expect(evaluateCriteria({ NONE: [{ field: 'bodyRegion', exists: true }] }, facts)).toBe(true);
  });

  it('combined with ALL', () => {
    const facts = makeFacts({ severity: 7, numbness: false });
    const criteria: MatchCriteria = {
      ALL: [{ field: 'severity', greaterThan: 5 }],
      NONE: [{ field: 'numbness', equals: true }],
    };
    expect(evaluateCriteria(criteria, facts)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Edge Cases (5 tests)
// ─────────────────────────────────────────────
describe('edge cases', () => {
  it('returns false for missing field', () => {
    const facts = makeFacts();
    expect(evaluateSingleCriterion({ field: 'nonexistent', equals: 'value' }, facts)).toBe(false);
  });

  it('handles null values gracefully', () => {
    const facts = makeFacts({ severity: null });
    expect(evaluateSingleCriterion({ field: 'severity', greaterThan: 0 }, facts)).toBe(false);
  });

  it('handles nested path with null intermediate', () => {
    const facts = makeFacts();
    expect(evaluateSingleCriterion({ field: 'imaging.finding', equals: 'disc_bulge' }, facts)).toBe(false);
  });

  it('handles empty arrays for containsAny', () => {
    const facts = makeFacts({ aggravatingFactors: [] });
    expect(evaluateSingleCriterion({ field: 'aggravatingFactors', containsAny: ['sitting'] }, facts)).toBe(false);
  });

  it('handles type mismatch (string vs number)', () => {
    const facts = makeFacts({ severity: 5 });
    // Comparing number to string should fail
    expect(evaluateSingleCriterion({ field: 'severity', equals: '5' as unknown as number }, facts)).toBe(false);
  });
});

// ─────────────────────────────────────────────
// Combined criteria (mixed ALL + ANY + NONE)
// ─────────────────────────────────────────────
describe('combined criteria', () => {
  it('ALL + ANY + NONE together', () => {
    const facts = makeFacts({
      severity: 7,
      bodyRegion: 'lumbar_spine',
      aggravatingFactors: ['sitting', 'bending'],
      numbness: false,
    });
    const criteria: MatchCriteria = {
      ALL: [
        { field: 'bodyRegion', equals: 'lumbar_spine' },
        { field: 'severity', greaterThan: 5 },
      ],
      ANY: [
        { field: 'aggravatingFactors', contains: 'sitting' },
        { field: 'aggravatingFactors', contains: 'walking' },
      ],
      NONE: [{ field: 'numbness', equals: true }],
    };
    expect(evaluateCriteria(criteria, facts)).toBe(true);
  });

  it('fails when NONE is violated', () => {
    const facts = makeFacts({
      severity: 7,
      bodyRegion: 'lumbar_spine',
      numbness: true,
    });
    const criteria: MatchCriteria = {
      ALL: [{ field: 'severity', greaterThan: 5 }],
      NONE: [{ field: 'numbness', equals: true }],
    };
    expect(evaluateCriteria(criteria, facts)).toBe(false);
  });

  it('empty criteria object returns true', () => {
    const facts = makeFacts();
    expect(evaluateCriteria({}, facts)).toBe(true);
  });
});
