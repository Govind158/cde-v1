/**
 * Score Interpreter — Tree 6
 *
 * 5-step interpretation chain per spec (kriya-cde-complete-tree-system.md Tree 6):
 *   1. Validate game result (range, duration, asymmetry)
 *   2. Compute percentile (normative data → linear fallback)
 *   3. Musculage contribution (weighted average BAL×0.25 + ROM×0.25 + MOB×0.25 + REF×0.25)
 *   4. Trend vs previous session (TODO Phase 6)
 *   5. Clinical relevance per hypothesis
 *
 * Percentile bands (spec 5-band system):
 *   excellent     81-100 — Above age-normal, no deficit
 *   good          61-80  — Within normal range
 *   fair          41-60  — Borderline — monitor
 *   below_average 21-40  — Deficit identified — intervention recommended
 *   poor           0-20  — Significant deficit — priority intervention
 *
 * Asymmetry thresholds (spec):
 *   Balance games (BB*): >20% side-to-side difference → flag
 *   ROM games (FA*):     >15% side-to-side difference → flag
 */

import type {
  ValidationResult,
  ScoreInterpretation,
  ScoreTrend,
  ClinicalRelevanceEntry,
  PercentileBand,
  Hypothesis,
} from '@/types/cde';
import { GAME_CATALOG } from '../ontology/game-catalog';

// ─── Step 1: Validate ───

export function validateGameResult(
  gameId: string,
  rawScore: number,
  subScores?: { left?: number; right?: number },
  durationSeconds?: number
): ValidationResult {
  const spec = GAME_CATALOG[gameId];
  if (!spec) {
    return { valid: false, reason: 'unknown_game_id' };
  }

  if (rawScore < spec.minPossibleScore || rawScore > spec.maxPossibleScore) {
    return { valid: false, reason: 'score_out_of_range', action: 'retry_with_guidance' };
  }

  if (durationSeconds !== undefined && durationSeconds > 0) {
    const minExpected = spec.expectedDurationRange[0] * 0.5;
    if (durationSeconds < minExpected) {
      return { valid: false, reason: 'completed_too_quickly', action: 'retry_with_instruction' };
    }
    const maxExpected = spec.expectedDurationRange[1] * 3;
    if (durationSeconds > maxExpected) {
      return { valid: false, reason: 'duration_too_long', action: 'retry_with_instruction' };
    }
  }

  // Bilateral asymmetry — thresholds per spec:
  //   Balance games (BB*): >20%  |  ROM games (FA*): >15%  |  others: >20%
  if (spec.bilateral && subScores) {
    const left = subScores.left ?? 0;
    const right = subScores.right ?? 0;
    const maxSide = Math.max(left, right, 1);
    const asymmetryPct = (Math.abs(left - right) / maxSide) * 100;
    const threshold = gameId.startsWith('FA') ? 15 : 20;

    if (asymmetryPct > threshold) {
      return {
        valid: true,
        flag: 'high_asymmetry',
        clinicalNote: `Significant L/R asymmetry (${Math.round(asymmetryPct)}%). May indicate unilateral pathology or measurement error.`,
      };
    }
  }

  return { valid: true };
}

// ─── Step 2: Percentile ───

export function computePercentile(
  gameId: string,
  rawScore: number,
  age?: number,
  _sex?: string
): number {
  // TODO (Phase 4): Query cdeNormativeData for gameId + age band + sex
  const spec = GAME_CATALOG[gameId];
  if (!spec) return 50;

  const range = spec.maxPossibleScore - spec.minPossibleScore;
  if (range === 0) return 50;

  const normalized = (rawScore - spec.minPossibleScore) / range;
  const percentile = Math.min(99, Math.max(1, Math.round(normalized * 100)));

  if (!age) return percentile;

  let ageAdjustment = 0;
  if (age >= 60) ageAdjustment = 5;
  else if (age >= 50) ageAdjustment = 3;
  else if (age >= 40) ageAdjustment = 1;

  return Math.min(99, Math.max(1, percentile + ageAdjustment));
}

// ─── Step 3a: 5-Band Classification (spec Tree 6) ───

export function getPercentileBand(percentile: number): PercentileBand {
  if (percentile >= 81) return 'excellent';      // Band 5
  if (percentile >= 61) return 'good';           // Band 4
  if (percentile >= 41) return 'fair';           // Band 3
  if (percentile >= 21) return 'below_average';  // Band 2
  return 'poor';                                 // Band 1
}

// ─── Step 3b: Musculage computation (spec Tree 6) ───
// weightedAverage(BAL×0.25 + ROM×0.25 + MOB×0.25 + REF×0.25)
// Redistributes weights equally when fewer than 4 categories tested.
// Minimum 2 categories required for a valid musculage score.

export function computeMusculage(
  gameScores: Record<string, { percentile: number }>
): number | null {
  const categoryPercentiles: Partial<Record<'BAL' | 'ROM' | 'MOB' | 'REF', number[]>> = {};

  for (const [gameId, score] of Object.entries(gameScores)) {
    let cat: 'BAL' | 'ROM' | 'MOB' | 'REF' | null = null;
    if (gameId.startsWith('BB')) cat = 'BAL';
    else if (gameId.startsWith('FA')) cat = 'ROM';
    else if (gameId.startsWith('KS')) cat = 'MOB';
    else if (gameId.startsWith('NN')) cat = 'REF';
    if (!cat) continue;
    if (!categoryPercentiles[cat]) categoryPercentiles[cat] = [];
    categoryPercentiles[cat]!.push(score.percentile);
  }

  const categories = Object.keys(categoryPercentiles) as Array<'BAL' | 'ROM' | 'MOB' | 'REF'>;
  if (categories.length < 2) return null;

  const weight = 1 / categories.length;
  let musculage = 0;
  for (const cat of categories) {
    const vals = categoryPercentiles[cat]!;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    musculage += avg * weight;
  }

  return Math.round(musculage);
}

// ─── Step 5 helper: Clinical Relevance ───

function assessClinicalRelevance(
  gameId: string,
  percentile: number,
  hypotheses: Array<{ conditionId: string; displayName: string; recommendedGames?: string[] }>
): ClinicalRelevanceEntry[] {
  const spec = GAME_CATALOG[gameId];
  if (!spec) return [];

  const relevance: ClinicalRelevanceEntry[] = [];

  for (const hyp of hypotheses) {
    const recGames = hyp.recommendedGames ?? [];
    if (!recGames.includes(gameId)) continue;

    if (percentile <= 40) {
      relevance.push({
        hypothesisId: hyp.conditionId,
        conditionDisplayName: hyp.displayName,
        relationship: 'supports',
        explanation: `Your ${spec.parameterDisplayName} score is below average for your age, which is consistent with ${hyp.displayName}.`,
      });
    } else if (percentile >= 61) {
      relevance.push({
        hypothesisId: hyp.conditionId,
        conditionDisplayName: hyp.displayName,
        relationship: 'weakens',
        explanation: `Your ${spec.parameterDisplayName} is above average, suggesting it may not be a primary contributor to your symptoms.`,
      });
    } else {
      relevance.push({
        hypothesisId: hyp.conditionId,
        conditionDisplayName: hyp.displayName,
        relationship: 'neutral',
        explanation: `Your ${spec.parameterDisplayName} is within the normal range for your age.`,
      });
    }
  }

  return relevance;
}

function lookupTrend(
  _factStore: Record<string, unknown>,
  _gameId: string
): ScoreTrend | null {
  // TODO (Phase 6): cross-session percentile comparison
  return null;
}

// ─── Main: Full Interpretation Chain ───

export function interpretGameResult(
  factStore: Record<string, unknown>,
  gameId: string,
  rawScore: number,
  subScores?: { left?: number; right?: number },
  durationSeconds?: number
): ScoreInterpretation {
  const spec = GAME_CATALOG[gameId];

  const validation = validateGameResult(gameId, rawScore, subScores, durationSeconds);
  if (!validation.valid) {
    return {
      gameId,
      rawScore,
      valid: false,
      validationIssue: validation.reason,
      percentile: 0,
      percentileBand: 'poor',
      musculageContribution: null,
      trend: null,
      clinicalRelevance: [],
      patientFacingSummary: 'This assessment result appears invalid. Please try again.',
      clinicianFacingSummary: `Invalid result for ${gameId}: ${validation.reason}`,
    };
  }

  const age = (factStore.age ?? 30) as number;
  const sex = factStore.sex as string | undefined;
  const percentile = computePercentile(gameId, rawScore, age, sex);
  const percentileBand = getPercentileBand(percentile);

  // Musculage contribution label (spec uses band name as contribution label)
  const musculageContribution: string = percentileBand;

  const trend: ScoreTrend | null = lookupTrend(factStore, gameId);

  const hypotheses = (factStore.activeHypotheses ?? []) as Hypothesis[];
  const clinicalRelevance = assessClinicalRelevance(gameId, percentile, hypotheses);

  const bandLabels: Record<PercentileBand, string> = {
    poor: 'significantly below average',
    below_average: 'below average',
    fair: 'in the borderline range',
    good: 'within the normal range',
    excellent: 'above average',
  };

  const bandClinical: Record<PercentileBand, string> = {
    poor: 'A significant deficit was identified — this is a priority area for intervention.',
    below_average: 'A deficit was identified — intervention is recommended.',
    fair: 'Borderline results — monitoring is advised.',
    good: 'Within normal range for your age group.',
    excellent: 'Above age-normal — no deficit detected.',
  };

  const paramName = spec?.parameterDisplayName ?? gameId;

  const patientFacingSummary =
    `Your ${paramName} is ${bandLabels[percentileBand]} for your age group. ${bandClinical[percentileBand]}` +
    (validation.flag === 'high_asymmetry'
      ? ' We also noticed a significant difference between your left and right sides.'
      : '') +
    (trend
      ? ` Compared to your last assessment, your score has ${trend.direction} by ${Math.abs(trend.changePercent)}%.`
      : '');

  const clinicianFacingSummary =
    `${gameId}: raw=${rawScore}, percentile=${percentile} (${percentileBand})` +
    (validation.flag ? `, flag=${validation.flag}` : '') +
    (trend ? `, trend=${trend.direction} ${trend.changePercent}%` : '');

  return {
    gameId,
    rawScore,
    valid: true,
    percentile,
    percentileBand,
    musculageContribution,
    trend,
    clinicalRelevance,
    patientFacingSummary,
    clinicianFacingSummary,
  };
}
