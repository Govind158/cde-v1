/**
 * Risk Stratifier — Tree 4
 *
 * Computes the clinical risk level for a scan session using additive factor scoring.
 * This is a deterministic algorithm — no LLM involvement.
 *
 * Spec (kriya-cde-complete-tree-system.md Tree 4):
 * 1. If any red flag is positive → return RED (bypasses scoring)
 * 2. Add up risk points from 6 universal factors + region-specific modifiers
 * 3. Map total: ≥12 = RED, 9-11 = ORANGE, 5-8 = YELLOW, 3-4 = GREEN, 0-2 = BLUE
 */

import type { RiskLevel } from '@/types/cde';

export interface RiskFactorBreakdown {
  severityPoints: number;
  durationPoints: number;
  neurologicalPoints: number;
  motorDeficitPoints: number;
  functionalImpactPoints: number;
  progressiveWorseningPoints: number;
  regionModifierPoints: number;
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
  const redFlags = (factStore.redFlags ?? {}) as Record<string, boolean | null>;

  // ── Step A: RED check — any positive red flag bypasses scoring entirely ──
  const hasPositiveRedFlag = Object.values(redFlags).some((v) => v === true);

  if (hasPositiveRedFlag) {
    return {
      severityPoints: 0,
      durationPoints: 0,
      neurologicalPoints: 0,
      motorDeficitPoints: 0,
      functionalImpactPoints: 0,
      progressiveWorseningPoints: 0,
      regionModifierPoints: 0,
      totalScore: 0,
      riskLevel: 'RED',
      redFlagOverride: true,
    };
  }

  // ── Step B: Additive factor scoring ──

  // Factor 1 — Severity (NPRS 0-10): +1 (1-3), +2 (4-5), +3 (6-7), +4 (8-10)
  let severityPoints = 0;
  const severity = factStore.severity as number | null;
  if (severity !== null && severity !== undefined) {
    if (severity >= 8) severityPoints = 4;
    else if (severity >= 6) severityPoints = 3;
    else if (severity >= 4) severityPoints = 2;
    else if (severity >= 1) severityPoints = 1;
  }

  // Factor 2 — Duration: +0 acute, +1 subacute, +2 chronic
  let durationPoints = 0;
  const duration = factStore.duration as string | null;
  if (duration === 'chronic_over_12_weeks' || duration === 'gt_3m') {
    durationPoints = 2;
  } else if (duration === 'subacute_6_12_weeks' || duration === '6w_3m') {
    durationPoints = 1;
  }

  // Factor 3 — Neurological (radiation / radicular pattern)
  let neurologicalPoints = 0;
  const radiation = factStore.radiation as string | null;
  if (radiation === 'radicular_below_knee' || radiation === 'below_knee' ||
      radiation === 'arm_below_elbow') {
    neurologicalPoints = 2;
  } else if (radiation === 'radicular_above_knee' || radiation === 'above_knee' ||
             radiation === 'arm_above_elbow') {
    neurologicalPoints = 1;
  }

  // Factor 4 — Motor / neurological deficit: +0 none, +2 sensory, +3 motor/both
  let motorDeficitPoints = 0;
  const neuroDeficit = factStore.neuroDeficit as string | null;
  const weakness = factStore.weakness as boolean | null;
  if (neuroDeficit === 'motor' || neuroDeficit === 'sensorimotor') {
    motorDeficitPoints = 3;
  } else if (neuroDeficit === 'sensory') {
    motorDeficitPoints = 2;
  } else if (weakness === true) {
    motorDeficitPoints = 2;
  }

  // Factor 5 — Functional impact (sleep+work+exercise sum 0-9)
  let functionalImpactPoints = 0;
  const rawFunctionalImpact = factStore.functionalImpact;
  const functionalImpactLabel: string | null =
    typeof rawFunctionalImpact === 'string' ? rawFunctionalImpact : null;
  let functionalScore = factStore.functionalScore as number | null;

  if (functionalScore === null && typeof rawFunctionalImpact === 'object' && rawFunctionalImpact !== null) {
    const sub = rawFunctionalImpact as Record<string, unknown>;
    functionalScore = (['sleep', 'work', 'exercise'] as const)
      .map((k) => (typeof sub[k] === 'number' ? (sub[k] as number) : 0))
      .reduce((a, b) => a + b, 0);
  }

  if (
    functionalImpactLabel === 'severe_functional_impact' || functionalImpactLabel === 'severe' ||
    (functionalScore !== null && functionalScore >= 6)
  ) {
    functionalImpactPoints = 3;
  } else if (
    functionalImpactLabel === 'moderate_functional_impact' || functionalImpactLabel === 'moderate' ||
    (functionalScore !== null && functionalScore >= 3)
  ) {
    functionalImpactPoints = 1;
  }

  // Factor 6 — Progressive worsening: +0 stable, +2 worsening
  let progressiveWorseningPoints = 0;
  const progressiveWorsening = factStore.progressiveWorsening as boolean | null;
  if (progressiveWorsening === true) {
    progressiveWorseningPoints = 2;
  }

  // ── Step C: Region-specific modifiers (spec Tree 4 Table) ──
  let regionModifierPoints = 0;
  const bodyRegion = factStore.bodyRegion as string | null;

  if (bodyRegion) {
    // BACK: Bilateral leg symptoms +2 (central stenosis / CES risk)
    if (['lumbar_spine', 'lower_back', 'back'].includes(bodyRegion)) {
      const bilateralLeg = factStore.bilateralLegSymptoms as boolean | null;
      if (bilateralLeg === true) regionModifierPoints += 2;
    }

    // NECK: Hand dexterity loss +3 (myelopathy), VBI symptoms +4 (forces RED)
    if (['cervical_spine', 'neck'].includes(bodyRegion)) {
      const handDexterity = factStore.handDexterity as string | null;
      if (handDexterity === 'significant') regionModifierPoints += 3;
      if (redFlags.vbiSymptoms === true) regionModifierPoints += 4;
    }

    // SHOULDER: Complete loss of active elevation +3 → ORANGE minimum
    if (['shoulder', 'shoulder_left', 'shoulder_right'].includes(bodyRegion)) {
      if (redFlags.shoulderDeformity === true || redFlags.completeLossElevation === true) {
        regionModifierPoints += 3;
      }
    }

    // KNEE: Rapid swelling (<2 hrs post-injury) +2 — haemarthrosis signal
    if (['knee', 'knee_left', 'knee_right'].includes(bodyRegion)) {
      const swellingSpeed = factStore.swellingSpeed as string | null;
      if (swellingSpeed === 'within_2_hours') regionModifierPoints += 2;
      if (redFlags.rapidSwelling === true) regionModifierPoints += 2;
    }

    // HIP: Age <16 + groin + adolescent limp +3 → ORANGE minimum (SCFE)
    if (['hip', 'hip_left', 'hip_right'].includes(bodyRegion)) {
      const age = factStore.age as number | null;
      const hipLocation = factStore.hipLocation as string | null;
      const adolescentLimp = redFlags.adolescentLimp === true;
      if (age && age < 16 && hipLocation === 'groin' && adolescentLimp) {
        regionModifierPoints += 3;
      }
    }

    // ANKLE: Unable to weight-bear 4 steps (Ottawa rules) +2
    if (['ankle', 'ankle_left', 'ankle_right'].includes(bodyRegion)) {
      if (redFlags.ottawaAnkle === true || redFlags.unableWeightbear === true) {
        regionModifierPoints += 2;
      }
    }

    // WRIST: Snuffbox tenderness post-fall +3 → ORANGE minimum (scaphoid)
    if (['wrist_hand', 'wrist', 'hand'].includes(bodyRegion)) {
      if (redFlags.snuffboxTenderness === true || redFlags.scaphoidRisk === true) {
        regionModifierPoints += 3;
      }
    }
  }

  const totalScore =
    severityPoints +
    durationPoints +
    neurologicalPoints +
    motorDeficitPoints +
    functionalImpactPoints +
    progressiveWorseningPoints +
    regionModifierPoints;

  // ── Step D: Map score to tier (spec thresholds) ──
  // RED ≥12 (even without explicit red flag — e.g. combined modifiers)
  // ORANGE 9-11, YELLOW 5-8, GREEN 3-4, BLUE 0-2
  let riskLevel: RiskLevel;
  if (totalScore >= 12) riskLevel = 'RED';
  else if (totalScore >= 9) riskLevel = 'ORANGE';
  else if (totalScore >= 5) riskLevel = 'YELLOW';
  else if (totalScore >= 3) riskLevel = 'GREEN';
  else riskLevel = 'BLUE';

  return {
    severityPoints,
    durationPoints,
    neurologicalPoints,
    motorDeficitPoints,
    functionalImpactPoints,
    progressiveWorseningPoints,
    regionModifierPoints,
    totalScore,
    riskLevel,
    redFlagOverride: false,
  };
}
