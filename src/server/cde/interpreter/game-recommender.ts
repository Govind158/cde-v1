/**
 * Game Recommender — Tree 5
 *
 * 5-step pipeline per spec (kriya-cde-complete-tree-system.md Tree 5):
 *   1. Collect candidate games from hypotheses
 *   2. Remove hypothesis-level contraindicated games
 *   3. Apply risk-level + region-condition restrictions
 *   4. Remove already-completed games
 *   5. Priority-score (×3 direct, ×2 secondary, ×1.5 intro, ×1.2 new) and return top N
 *
 * Global contraindications by risk tier (spec Table):
 *   RED    — no games at all
 *   ORANGE — block BB3, BB4, KS5, KS6, FA4, FA5
 *   YELLOW — block BB4, KS6
 *   GREEN/BLUE — no restrictions
 */

import type { RiskLevel, GameRecommendation } from '@/types/cde';
import { RISK_TIER_ACTIONS } from '@/types/cde';
import { GAME_CATALOG, HIGH_INTENSITY_GAMES } from '../ontology/game-catalog';
import { getContraindicatedGames } from '../safety/contraindications';

// Spec-defined global risk-tier contraindication sets
const ORANGE_BLOCKED_GAMES = new Set(['BB3', 'BB4', 'KS5', 'KS6', 'FA4', 'FA5']);
const YELLOW_BLOCKED_GAMES = new Set(['BB4', 'KS6']);

interface HypothesisInput {
  conditionId: string;
  displayName: string;
  recommendedGames: string[];
  contraindicatedGames: string[];
}

/**
 * Recommend games based on hypotheses, risk level, and session state.
 * Returns a deterministic, priority-sorted list capped at maxGames.
 */
export function recommendGames(
  hypotheses: HypothesisInput[],
  riskLevel: RiskLevel,
  completedGames: string[],
  conditionTags: string[],
  maxGames: number = 3
): GameRecommendation[] {
  // ── Step 1: Collect candidate games from hypotheses ──
  const candidateGames = new Set<string>();
  const hypContraindicated = new Set<string>();

  for (const hyp of hypotheses) {
    for (const g of hyp.recommendedGames ?? []) candidateGames.add(g);
    for (const g of hyp.contraindicatedGames ?? []) hypContraindicated.add(g);
  }

  // ── Step 2: Remove hypothesis-level contraindicated games ──
  for (const g of hypContraindicated) {
    candidateGames.delete(g);
  }

  // Also apply registry-based condition contraindications
  const hypothesisIds = hypotheses.map((h) => h.conditionId);
  const registryContraindicated = getContraindicatedGames(conditionTags, hypothesisIds);
  for (const g of registryContraindicated) {
    candidateGames.delete(g);
  }

  // ── Step 3: Apply risk-level global restrictions ──
  const tierConfig = RISK_TIER_ACTIONS[riskLevel];

  if (!tierConfig.gamesAllowed) {
    return []; // RED tier — no games
  }

  // ORANGE: block BB3, BB4, KS5, KS6, FA4, FA5 (no high-demand balance/squat/loaded movement)
  if (riskLevel === 'ORANGE') {
    for (const g of ORANGE_BLOCKED_GAMES) candidateGames.delete(g);
    // Also remove any remaining high-intensity games
    for (const g of HIGH_INTENSITY_GAMES) candidateGames.delete(g);
  }

  // YELLOW: block BB4, KS6 (no extreme balance or lateral load)
  if (riskLevel === 'YELLOW') {
    for (const g of YELLOW_BLOCKED_GAMES) candidateGames.delete(g);
  }

  // ── Step 4: Remove already-completed games ──
  const completedSet = new Set(completedGames);
  for (const g of completedSet) {
    candidateGames.delete(g);
  }

  // ── Step 5: Priority scoring (spec weights) ──
  const scoredGames: Array<{ gameId: string; score: number }> = [];

  // Pre-compute which parameters are primarily tested by hypotheses
  const primaryParams = new Set(
    hypotheses.flatMap((h) =>
      (h.recommendedGames ?? [])
        .map((g) => GAME_CATALOG[g]?.parameter)
        .filter((p): p is string => Boolean(p))
    )
  );

  for (const gameId of candidateGames) {
    const spec = GAME_CATALOG[gameId];
    if (!spec) continue;

    let score = 0;

    // Directly tests the hypothesized parameter ×3
    const hypothesisCount = hypotheses.filter(
      (h) => (h.recommendedGames ?? []).includes(gameId)
    ).length;
    score += hypothesisCount * 3;

    // Tests a secondary related parameter ×2
    if (primaryParams.has(spec.parameter) && hypothesisCount === 0) score += 2;

    // Introductory/baseline game (difficulty 1) ×1.5 — use avgDuration as proxy for difficulty
    if (spec.avgDurationSeconds <= 45) score = Math.round(score * 1.5);

    // Shorter games rank slightly higher (user fatigue)
    if (spec.avgDurationSeconds < 60) score += 1;

    scoredGames.push({ gameId, score });
  }

  // Sort by score descending, then by gameId for deterministic tie-breaking
  scoredGames.sort((a, b) => b.score - a.score || a.gameId.localeCompare(b.gameId));

  // Return top N
  return scoredGames.slice(0, maxGames).map(({ gameId, score }) => {
    const spec = GAME_CATALOG[gameId]!;
    return {
      gameId,
      parameter: spec.parameter,
      parameterDisplayName: spec.parameterDisplayName,
      purpose: `This tests your ${spec.parameterDisplayName}, which may be contributing to your symptoms.`,
      estimatedDuration: spec.avgDurationSeconds,
      estimatedDurationSeconds: spec.avgDurationSeconds,
      priority: score,
      contraindicationNote: null,
    };
  });
}
