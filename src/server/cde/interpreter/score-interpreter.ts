/**
 * Score Interpreter — Tree 6
 *
 * 5-step interpretation chain:
 *   1. Validate game result (range, duration, asymmetry)
 *   2. Compute percentile (normative data → linear fallback)
 *   3. Determine musculage contribution
 *   4. Compute trend (vs previous session — TODO: full implementation)
 *   5. Assess clinical relevance per hypothesis
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

  // Range check
  if (rawScore < spec.minPossibleScore || rawScore > spec.maxPossibleScore) {
    return { valid: false, reason: 'score_out_of_range', action: 'retry_with_guidance' };
  }

  // Duration check — too fast
  if (durationSeconds !== undefined && durationSeconds > 0) {
    const minExpected = spec.expectedDurationRange[0] * 0.5;
    if (durationSeconds < minExpected) {
      return { valid: false, reason: 'completed_too_quickly', action: 'retry_with_instruction' };
    }
    // Duration check — too long (probably paused)
    const maxExpected = spec.expectedDurationRange[1] * 3;
    if (durationSeconds > maxExpected) {
      return { valid: false, reason: 'duration_too_long', action: 'retry_with_instruction' };
    }
  }

  // Bilateral asymmetry check
  if (spec.bilateral && subScores) {
    const left = subScores.left ?? 0;
    const right = subScores.right ?? 0;
    const maxSide = Math.max(left, right, 1);
    const asymmetry = (Math.abs(left - right) / maxSide) * 100;
    if (asymmetry > 40) {
      return {
        valid: true,
        flag: 'high_asymmetry',
        clinicalNote: `Significant L/R asymmetry (${Math.round(asymmetry)}%). May indicate unilateral pathology or measurement error.`,
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
  // TODO: Query cdeNormativeData table for gameId + age band + sex
  // When normative data is populated (Phase 4+), replace this fallback with:
  //   SELECT * FROM cdeNormativeData WHERE gameId = ? AND ageBandMin <= ? AND ageBandMax >= ?
  //   Then interpolate rawScore against p10, p25, p50, p75, p90

  const spec = GAME_CATALOG[gameId];
  if (!spec) return 50; // safe default

  // Linear fallback: normalise rawScore to 0-100 percentile range
  const range = spec.maxPossibleScore - spec.minPossibleScore;
  if (range === 0) return 50;

  const normalized = (rawScore - spec.minPossibleScore) / range;
  const percentile = Math.min(99, Math.max(1, Math.round(normalized * 100)));

  if (!age) {
    // No age adjustment possible
    return percentile;
  }

  // Simple age adjustment: older adults get a slight boost (±5 percentile points)
  // This is a rough heuristic until normative data is loaded.
  let ageAdjustment = 0;
  if (age >= 60) ageAdjustment = 5;
  else if (age >= 50) ageAdjustment = 3;
  else if (age >= 40) ageAdjustment = 1;

  return Math.min(99, Math.max(1, percentile + ageAdjustment));
}

// ─── Step 3: Percentile Band ───

export function getPercentileBand(percentile: number): PercentileBand {
  if (percentile < 10) return 'below_10th';
  if (percentile < 25) return '10th_to_25th';
  if (percentile <= 75) return '25th_to_75th';
  return 'above_75th';
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

    if (percentile < 25) {
      relevance.push({
        hypothesisId: hyp.conditionId,
        conditionDisplayName: hyp.displayName,
        relationship: 'supports',
        explanation: `Your ${spec.parameterDisplayName} score is below average for your age, which is consistent with ${hyp.displayName}.`,
      });
    } else if (percentile > 75) {
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

// ─── Step 4 helper: Trend Lookup ───

/**
 * Look up previous session result for trend comparison.
 * Returns null until cross-session persistence is wired (Phase 6).
 */
function lookupTrend(
  _factStore: Record<string, unknown>,
  _gameId: string
): ScoreTrend | null {
  // TODO (Phase 6): Query DB for previous game result:
  //   SELECT percentile, playedAt FROM game_results
  //   WHERE userId = factStore.userId AND gameId = _gameId
  //   ORDER BY playedAt DESC LIMIT 1
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

  // Step 1 — Validate
  const validation = validateGameResult(gameId, rawScore, subScores, durationSeconds);
  if (!validation.valid) {
    return {
      gameId,
      rawScore,
      valid: false,
      validationIssue: validation.reason,
      percentile: 0,
      percentileBand: 'below_10th',
      musculageContribution: null,
      trend: null,
      clinicalRelevance: [],
      patientFacingSummary: 'This assessment result appears invalid. Please try again.',
      clinicianFacingSummary: `Invalid result for ${gameId}: ${validation.reason}`,
    };
  }

  // Step 2 — Compute percentile
  const age = (factStore.age ?? 30) as number;
  const sex = factStore.sex as string | undefined;
  const percentile = computePercentile(gameId, rawScore, age, sex);
  const percentileBand = getPercentileBand(percentile);

  // Step 3 — Musculage contribution
  let musculageContribution: string | null = null;
  if (percentileBand === 'below_10th') musculageContribution = 'significantly_below';
  else if (percentileBand === '10th_to_25th') musculageContribution = 'below_average';
  else if (percentileBand === '25th_to_75th') musculageContribution = 'average';
  else musculageContribution = 'above_average';

  // Step 4 — Trend (TODO: query previous session results from DB)
  // For now returns null. When cross-session persistence is wired (Phase 6),
  // this will query: SELECT percentile FROM game_results WHERE userId = ? AND gameId = ? ORDER BY playedAt DESC LIMIT 1
  const trend: ScoreTrend | null = lookupTrend(factStore, gameId);

  // Step 5 — Clinical relevance
  const hypotheses = (factStore.activeHypotheses ?? []) as Hypothesis[];
  const clinicalRelevance = assessClinicalRelevance(gameId, percentile, hypotheses);

  // Build summaries
  const bandLabels: Record<PercentileBand, string> = {
    below_10th: 'significantly below average',
    '10th_to_25th': 'slightly below average',
    '25th_to_75th': 'within the normal range',
    above_75th: 'above average',
  };

  const paramName = spec?.parameterDisplayName ?? gameId;

  const patientFacingSummary = `Your ${paramName} is ${bandLabels[percentileBand]} for your age group.${
    validation.flag === 'high_asymmetry'
      ? ' We also noticed a significant difference between your left and right sides.'
      : ''
  }${
    trend
      ? ` Compared to your last assessment, your score has ${trend.direction} by ${Math.abs(trend.changePercent)}%.`
      : ''
  }`;

  const clinicianFacingSummary = `${gameId}: raw=${rawScore}, percentile=${percentile} (${percentileBand})${
    validation.flag ? `, flag=${validation.flag}` : ''
  }${trend ? `, trend=${trend.direction} ${trend.changePercent}%` : ''}`;

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
