/**
 * Game Recommender — Tree 5
 *
 * 5-step pipeline:
 *   1. Collect candidate games from hypotheses
 *   2. Remove contraindicated games
 *   3. Apply risk-level restrictions (RED = no games, ORANGE = no high-intensity)
 *   4. Remove already-completed games
 *   5. Priority-score and return top N
 */

import type { RiskLevel, GameRecommendation } from '@/types/cde';
import { RISK_TIER_ACTIONS } from '@/types/cde';
import { GAME_CATALOG, HIGH_INTENSITY_GAMES } from '../ontology/game-catalog';

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
  _conditionTags: string[],
  maxGames: number = 3
): GameRecommendation[] {
  // ── Step 1: Collect candidate games from hypotheses ──
  const candidateGames = new Set<string>();
  const contraindicatedGames = new Set<string>();

  for (const hyp of hypotheses) {
    for (const g of hyp.recommendedGames ?? []) candidateGames.add(g);
    for (const g of hyp.contraindicatedGames ?? []) contraindicatedGames.add(g);
  }

  // ── Step 2: Remove contraindicated games ──
  for (const g of contraindicatedGames) {
    candidateGames.delete(g);
  }
  // Formal contraindication registry will be wired in Phase 3 Step 3.2

  // ── Step 3: Apply risk-level restrictions ──
  const tierConfig = RISK_TIER_ACTIONS[riskLevel];

  if (!tierConfig.gamesAllowed) {
    return []; // RED tier — no games at all
  }

  if (!tierConfig.highIntensityAllowed) {
    // ORANGE tier — remove high intensity games (FA5, NN5)
    for (const g of HIGH_INTENSITY_GAMES) {
      candidateGames.delete(g);
    }
  }

  // ── Step 4: Remove already-completed games ──
  const completedSet = new Set(completedGames);
  for (const g of completedSet) {
    candidateGames.delete(g);
  }

  // ── Step 5: Priority scoring ──
  const scoredGames: Array<{ gameId: string; score: number }> = [];

  for (const gameId of candidateGames) {
    const spec = GAME_CATALOG[gameId];
    if (!spec) continue;

    let score = 0;

    // Games appearing in multiple hypotheses rank higher
    const hypothesisCount = hypotheses.filter(
      (h) => (h.recommendedGames ?? []).includes(gameId)
    ).length;
    score += hypothesisCount * 3;

    // Games testing commonly affected parameters rank higher
    const affectedParams = new Set(
      hypotheses.flatMap((h) =>
        (h.recommendedGames ?? [])
          .map((g) => GAME_CATALOG[g]?.parameter)
          .filter(Boolean)
      )
    );
    if (affectedParams.has(spec.parameter)) score += 2;

    // Shorter games rank slightly higher (reduces user fatigue)
    if (spec.avgDurationSeconds < 60) score += 1;

    scoredGames.push({ gameId, score });
  }

  // Sort by score descending, then by gameId for deterministic ordering
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
