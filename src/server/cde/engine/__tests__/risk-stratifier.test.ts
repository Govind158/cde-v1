import { describe, it, expect } from 'vitest';
import { computeRiskLevel, computeRiskBreakdown } from '../risk-stratifier';

function makeFactStore(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    severity: null,
    duration: null,
    radiation: null,
    neuroDeficit: null,
    weakness: null,
    functionalImpact: null,
    functionalScore: null,
    progressiveWorsening: null,
    redFlags: {},
    ...overrides,
  };
}

describe('Risk Stratifier', () => {
  // Test 1: All zeros → BLUE
  it('returns BLUE when all factors are zero', () => {
    const result = computeRiskBreakdown(makeFactStore());
    expect(result.riskLevel).toBe('BLUE');
    expect(result.totalScore).toBe(0);
    expect(result.redFlagOverride).toBe(false);
  });

  // Test 2: Severity 3 only → GREEN (score=1)
  it('returns GREEN for low severity only (score 1)', () => {
    const result = computeRiskBreakdown(makeFactStore({ severity: 3 }));
    expect(result.severityPoints).toBe(1);
    expect(result.totalScore).toBe(1);
    expect(result.riskLevel).toBe('GREEN');
  });

  // Test 3: Severity 5 + chronic → YELLOW (2+2=4)
  it('returns YELLOW for moderate severity + chronic duration', () => {
    const result = computeRiskBreakdown(makeFactStore({
      severity: 5,
      duration: 'chronic_over_12_weeks',
    }));
    expect(result.severityPoints).toBe(2);
    expect(result.durationPoints).toBe(2);
    expect(result.totalScore).toBe(4);
    expect(result.riskLevel).toBe('YELLOW');
  });

  // Test 4: Severity 7 + chronic + motor deficit + moderate functional → ORANGE (3+2+3+1=9)
  it('returns ORANGE for high severity + chronic + motor deficit + moderate functional', () => {
    const result = computeRiskBreakdown(makeFactStore({
      severity: 7,
      duration: 'chronic_over_12_weeks',
      neuroDeficit: 'motor',
      functionalImpact: 'moderate_functional_impact',
    }));
    expect(result.severityPoints).toBe(3);
    expect(result.durationPoints).toBe(2);
    expect(result.motorDeficitPoints).toBe(3);
    expect(result.functionalImpactPoints).toBe(1);
    expect(result.totalScore).toBe(9);
    expect(result.riskLevel).toBe('ORANGE');
  });

  // Test 5: Red flag positive → RED regardless of other scores
  it('returns RED when any red flag is positive regardless of other factors', () => {
    const result = computeRiskBreakdown(makeFactStore({
      severity: 2,
      duration: 'acute_0_6_weeks',
      redFlags: { caudaEquina: true },
    }));
    expect(result.riskLevel).toBe('RED');
    expect(result.redFlagOverride).toBe(true);
    expect(result.totalScore).toBe(0); // scoring bypassed
  });

  // Test 6: Boundary — score exactly 4 → YELLOW
  it('maps score exactly 4 to YELLOW', () => {
    const result = computeRiskBreakdown(makeFactStore({
      severity: 4, // 2 points
      duration: 'chronic_over_12_weeks', // 2 points
    }));
    expect(result.totalScore).toBe(4);
    expect(result.riskLevel).toBe('YELLOW');
  });

  // Test 7: Boundary — score exactly 8 → ORANGE
  it('maps score exactly 8 to ORANGE', () => {
    const result = computeRiskBreakdown(makeFactStore({
      severity: 8, // 4 points
      duration: 'chronic_over_12_weeks', // 2 points
      progressiveWorsening: true, // 2 points
    }));
    expect(result.totalScore).toBe(8);
    expect(result.riskLevel).toBe('ORANGE');
  });

  // Test 8: Duration 'gt_3m' (legacy value) maps to chronic → +2 points
  it('handles legacy duration value gt_3m as chronic', () => {
    const result = computeRiskBreakdown(makeFactStore({
      duration: 'gt_3m',
    }));
    expect(result.durationPoints).toBe(2);
  });

  // Additional: subacute duration gives 1 point
  it('gives 1 point for subacute duration', () => {
    const result = computeRiskBreakdown(makeFactStore({
      duration: 'subacute_6_12_weeks',
    }));
    expect(result.durationPoints).toBe(1);
  });

  // Additional: sensory neuroDeficit gives 1 motor point
  it('gives 1 point for sensory neuroDeficit', () => {
    const result = computeRiskBreakdown(makeFactStore({
      neuroDeficit: 'sensory',
    }));
    expect(result.motorDeficitPoints).toBe(1);
  });

  // Additional: functionalScore numeric fallback
  it('uses functionalScore numeric value when string classification missing', () => {
    const result = computeRiskBreakdown(makeFactStore({
      functionalScore: 7,
    }));
    expect(result.functionalImpactPoints).toBe(3); // >= 6 → severe
  });

  // Convenience wrapper returns just the level
  it('computeRiskLevel returns level string directly', () => {
    expect(computeRiskLevel(makeFactStore())).toBe('BLUE');
    expect(computeRiskLevel(makeFactStore({ severity: 5 }))).toBe('GREEN');
    expect(computeRiskLevel(makeFactStore({ redFlags: { infection: true } }))).toBe('RED');
  });
});
