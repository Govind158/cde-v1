/**
 * Contraindication Registry
 *
 * Maps conditions and risk factors to games that should NOT be recommended.
 * Checked by the game recommender (Tree 5 Step 2 + Step 3).
 *
 * Sources:
 * - kriya-cde-complete-tree-system.md Tree 5 Step 3 (region-specific contraindications)
 * - clinical-decision-engine-guide.md
 */

// ─── Condition-based contraindications ───

const CONDITION_CONTRAINDICATIONS: Record<string, string[]> = {
  // Lumbar / disc
  disc_herniation: ['FA5'],
  disc_herniation_with_radiculopathy: ['FA5', 'NN5'],
  acute_radiculopathy: ['FA5', 'NN5'],
  spinal_stenosis: ['FA1', 'FA5'],
  severe_stenosis: ['FA1', 'FA4', 'FA5'],
  acute_fracture: [],
  spondylolisthesis: ['FA5', 'NN5'],
  acute_disc_bulge: ['FA5'],
  hyp_flexion_intolerant: ['FA5'],
  hyp_extension_intolerant: ['FA4'],

  // ─── Neck / Cervical ───
  // Cervical myelopathy: no loaded flexion or squat with cord compromise (spec)
  hyp_neck_myelopathy: ['FA4', 'KS5', 'KS6'],
  neck_myelopathy: ['FA4', 'KS5', 'KS6'],
  // Cervical instability: controlled rotation only (spec)
  hyp_neck_instability: ['FA3'],
  neck_instability: ['FA3'],
  // Cervical radiculopathy (severe): no high-demand neuro loading
  hyp_neck_radiculopathy: ['NN5', 'FA5'],
  neck_radiculopathy: ['NN5', 'FA5'],

  // ─── Shoulder ───
  // Full RC tear / significant structural injury: no behind-back or rotational load (spec)
  shoulder_rc_full_tear: ['FA2', 'FA5'],
  // Frozen shoulder: no forced rotation
  hyp_shoulder_frozen: ['FA5'],
  shoulder_frozen: ['FA5'],
  // Post-dislocation instability: no overhead instability loading
  hyp_shoulder_instability: ['FA5'],

  // ─── Knee ───
  // Acute ligament injuries: no loaded squat or lateral lunge (spec)
  hyp_knee_acl: ['KS5', 'KS6'],
  knee_acl: ['KS5', 'KS6'],
  hyp_knee_mcl: ['KS5', 'KS6'],
  knee_mcl: ['KS5', 'KS6'],
  hyp_knee_pcl: ['KS5', 'KS6'],
  knee_pcl: ['KS5', 'KS6'],
  hyp_knee_lcl: ['KS5', 'KS6'],
  knee_lcl: ['KS5', 'KS6'],
  // Acute meniscal: no deep loaded flexion
  hyp_knee_meniscal_med: ['KS5'],
  hyp_knee_meniscal_lat: ['KS5'],

  // ─── Ankle ───
  // Acute ankle (any): no single-leg or loaded lower limb (spec)
  hyp_ankle_lateral_sprain: ['BB3', 'BB4', 'KS5', 'KS6'],
  ankle_lateral_sprain: ['BB3', 'BB4', 'KS5', 'KS6'],
  hyp_ankle_achilles: ['BB3', 'BB4', 'KS6'],
  ankle_achilles_tendinopathy: ['BB3', 'BB4', 'KS6'],
  hyp_ankle_stress_fx: ['BB3', 'BB4', 'KS5', 'KS6'],
  ankle_stress_fracture: ['BB3', 'BB4', 'KS5', 'KS6'],
  // Chronic instability: no extreme balance challenge
  hyp_ankle_instability: ['BB4'],
  ankle_instability: ['BB4'],

  // ─── Elbow ───
  // Acute ligament: no loaded gripping
  hyp_elbow_acute_lig: ['FA1'],
  elbow_acute_ligament: ['FA1'],

  // ─── Wrist / Hand ───
  // Acute ligament: no loaded wrist extension
  hyp_wrist_acute_lig: ['FA1'],
  wrist_acute_ligament: ['FA1'],
};

// ─── Risk-factor contraindications ───

const RISK_FACTOR_CONTRAINDICATIONS: Record<string, string[]> = {
  severe_pain: ['FA5', 'NN5'],
  balance_affected: ['BB3', 'BB4'],
  recent_surgery: ['FA5', 'NN5', 'KS3'],
  active_inflammation: ['KS5', 'KS6', 'FA4', 'FA5'],
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

  for (const tag of conditionTags) {
    const games = CONDITION_CONTRAINDICATIONS[tag];
    if (games) games.forEach((g) => contraindicated.add(g));
  }

  for (const hypId of hypothesisIds) {
    const games = CONDITION_CONTRAINDICATIONS[hypId];
    if (games) games.forEach((g) => contraindicated.add(g));
  }

  for (const factor of riskFactors) {
    const games = RISK_FACTOR_CONTRAINDICATIONS[factor];
    if (games) games.forEach((g) => contraindicated.add(g));
  }

  return contraindicated;
}

/**
 * Get a human-readable contraindication note for a specific game.
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
