/**
 * Contraindication Registry
 *
 * Maps conditions and risk factors to games that should NOT be recommended.
 * Checked by the game recommender before finalizing recommendations.
 */

// Condition-based contraindications
const CONDITION_CONTRAINDICATIONS: Record<string, string[]> = {
  disc_herniation: ['FA5'],
  disc_herniation_with_radiculopathy: ['FA5', 'NN5'],
  acute_radiculopathy: ['FA5', 'NN5'],
  spinal_stenosis: ['FA1', 'FA5'],
  severe_stenosis: ['FA1', 'FA4', 'FA5'],
  acute_fracture: [], // no games at all — handled by RED risk level
  spondylolisthesis: ['FA5', 'NN5'],
  acute_disc_bulge: ['FA5'],
  hyp_flexion_intolerant: ['FA5'], // deep squat contraindicated for flexion-intolerant
  hyp_extension_intolerant: ['FA4'], // back extension contraindicated for extension-intolerant
};

// Risk-factor-based contraindications
const RISK_FACTOR_CONTRAINDICATIONS: Record<string, string[]> = {
  severe_pain: ['FA5', 'NN5'], // high intensity games when pain > 7
  balance_affected: ['BB3'], // eyes-closed balance when balance is already compromised
  recent_surgery: ['FA5', 'NN5', 'KS3'],
};

/**
 * Get the full set of contraindicated game IDs for a patient's profile.
 */
export function getContraindicatedGames(
  conditionTags: string[],
  hypothesisIds: string[],
  riskFactors: string[] = []
): Set<string> {
  const contraindicated = new Set<string>();

  // Check condition-based
  for (const tag of conditionTags) {
    const games = CONDITION_CONTRAINDICATIONS[tag];
    if (games) games.forEach((g) => contraindicated.add(g));
  }

  // Check hypothesis-based
  for (const hypId of hypothesisIds) {
    const games = CONDITION_CONTRAINDICATIONS[hypId];
    if (games) games.forEach((g) => contraindicated.add(g));
  }

  // Check risk-factor-based
  for (const factor of riskFactors) {
    const games = RISK_FACTOR_CONTRAINDICATIONS[factor];
    if (games) games.forEach((g) => contraindicated.add(g));
  }

  return contraindicated;
}

/**
 * Get a human-readable contraindication note for a specific game.
 * Returns null if the game is not contraindicated for the given conditions.
 */
export function getContraindicationNote(
  gameId: string,
  conditionTags: string[]
): string | null {
  for (const tag of conditionTags) {
    const games = CONDITION_CONTRAINDICATIONS[tag];
    if (games?.includes(gameId)) {
      return `This assessment may not be suitable due to ${tag.replace(/_/g, ' ')}. Proceed with caution.`;
    }
  }
  return null;
}
