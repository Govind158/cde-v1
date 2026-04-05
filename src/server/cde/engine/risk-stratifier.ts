/**
 * Risk Stratifier — Tree 4
 *
 * Computes the clinical risk level for a scan session using additive factor scoring.
 * This is a deterministic algorithm — no LLM involvement.
 *
 * Algorithm from clinical-decision-engine-guide.md Section 6.2:
 * 1. If any red flag is positive → return RED (bypasses scoring)
 * 2. Add up risk points from 6 factors (severity, duration, neuro, motor, functional, progressive)
 * 3. Map total score to tier: 8+ = ORANGE, 4-7 = YELLOW, 1-3 = GREEN, 0 = BLUE
 */

import type { RiskLevel } from '@/types/cde';

export interface RiskFactorBreakdown {
  severityPoints: number;
  durationPoints: number;
  neurologicalPoints: number;
  motorDeficitPoints: number;
  functionalImpactPoints: number;
  progressiveWorseningPoints: number;
  totalScore: number;
  riskLevel: RiskLevel;
  redFlagOverride: boolean;
}

/**
 * Compute the risk level from a FactStore snapshot.
 */
export function computeRiskLevel(factStore: Record<string, unknown>): RiskLevel {
  return computeRiskBreakdown(factStore).riskLevel;
}

/**
 * Compute the full risk factor breakdown with per-factor scores.
 * Returns the risk level plus every contributing factor for transparency.
 */
export function computeRiskBreakdown(factStore: Record<string, unknown>): RiskFactorBreakdown {
  // ── Step A: RED check — any positive red flag bypasses scoring entirely ──
  const redFlags = (factStore.redFlags ?? {}) as Record<string, boolean | null>;
  const hasPositiveRedFlag = Object.values(redFlags).some((v) => v === true);

  if (hasPositiveRedFlag) {
    return {
      severityPoints: 0,
      durationPoints: 0,
      neurologicalPoints: 0,
      motorDeficitPoints: 0,
      functionalImpactPoints: 0,
      progressiveWorseningPoints: 0,
      totalScore: 0,
      riskLevel: 'RED',
      redFlagOverride: true,
    };
  }

  // ── Step B: Additive factor scoring ──

  // Factor 1 — Severity (NPRS 0-10)
  let severityPoints = 0;
  const severity = factStore.severity as number | null;
  if (severity !== null && severity !== undefined) {
    if (severity >= 8) severityPoints = 4;
    else if (severity >= 6) severityPoints = 3;
    else if (severity >= 4) severityPoints = 2;
    else if (severity >= 2) severityPoints = 1;
    // severity 0-1 = 0 points
  }

  // Factor 2 — Duration
  let durationPoints = 0;
  const duration = factStore.duration as string | null;
  if (duration === 'chronic_over_12_weeks' || duration === 'gt_3m') {
    durationPoints = 2;
  } else if (duration === 'subacute_6_12_weeks' || duration === '6w_3m') {
    durationPoints = 1;
  }
  // acute = 0 points

  // Factor 3 — Neurological (radiation pattern)
  let neurologicalPoints = 0;
  const radiation = factStore.radiation as string | null;
  if (radiation === 'radicular_below_knee' || radiation === 'below_knee') {
    neurologicalPoints = 2;
  } else if (radiation === 'radicular_above_knee' || radiation === 'above_knee') {
    neurologicalPoints = 1;
  }

  // Factor 4 — Motor deficit
  let motorDeficitPoints = 0;
  const neuroDeficit = factStore.neuroDeficit as string | null;
  const weakness = factStore.weakness as boolean | null;
  if (neuroDeficit === 'motor' || neuroDeficit === 'sensorimotor') {
    motorDeficitPoints = 3;
  } else if (neuroDeficit === 'sensory') {
    motorDeficitPoints = 1;
  } else if (weakness === true) {
    motorDeficitPoints = 2;
  }

  // Factor 5 — Functional impact
  let functionalImpactPoints = 0;
  const rawFunctionalImpact = factStore.functionalImpact;
  // functionalImpact may be:
  //   - a string label ("moderate_functional_impact", "moderate", etc.)
  //   - an object {sleep, work, exercise} if scoring hasn't run yet
  const functionalImpactLabel: string | null =
    typeof rawFunctionalImpact === 'string' ? rawFunctionalImpact : null;
  let functionalScore = factStore.functionalScore as number | null;

  // If sub-fields are present and no score yet, compute on the fly
  if (functionalScore === null && typeof rawFunctionalImpact === 'object' && rawFunctionalImpact !== null) {
    const sub = rawFunctionalImpact as Record<string, unknown>;
    const sum = (['sleep', 'work', 'exercise'] as const)
      .map((k) => (typeof sub[k] === 'number' ? (sub[k] as number) : 0))
      .reduce((a, b) => a + b, 0);
    functionalScore = sum;
  }

  if (
    functionalImpactLabel === 'severe_functional_impact' ||
    functionalImpactLabel === 'severe' ||
    (functionalScore !== null && functionalScore >= 6)
  ) {
    functionalImpactPoints = 3;
  } else if (
    functionalImpactLabel === 'moderate_functional_impact' ||
    functionalImpactLabel === 'moderate' ||
    (functionalScore !== null && functionalScore >= 3)
  ) {
    functionalImpactPoints = 1;
  }

  // Factor 6 — Progressive worsening
  let progressiveWorseningPoints = 0;
  const progressiveWorsening = factStore.progressiveWorsening as boolean | null;
  if (progressiveWorsening === true) {
    progressiveWorseningPoints = 2;
  }

  const totalScore =
    severityPoints +
    durationPoints +
    neurologicalPoints +
    motorDeficitPoints +
    functionalImpactPoints +
    progressiveWorseningPoints;

  // ── Step C: Map score to tier ──
  let riskLevel: RiskLevel;
  if (totalScore >= 8) riskLevel = 'ORANGE';
  else if (totalScore >= 4) riskLevel = 'YELLOW';
  else if (totalScore >= 1) riskLevel = 'GREEN';
  else riskLevel = 'BLUE';

  return {
    severityPoints,
    durationPoints,
    neurologicalPoints,
    motorDeficitPoints,
    functionalImpactPoints,
    progressiveWorseningPoints,
    totalScore,
    riskLevel,
    redFlagOverride: false,
  };
}
