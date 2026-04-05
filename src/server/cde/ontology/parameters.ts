/**
 * Parameters — Assessment parameter definitions
 * Defines parameters measured by assessment games.
 * Maps parameter IDs to the game IDs that test them.
 */

export interface AssessmentParameterDef {
  id: string;
  displayName: string;
  tests: string[];
  metrics: string[];
  ageAdjusted: boolean;
}

export const ASSESSMENT_PARAMETERS: Record<string, AssessmentParameterDef> = {
  BAL: {
    id: 'BAL',
    displayName: 'Balance',
    tests: ['BB1', 'BB2', 'BB3', 'BB4'],
    metrics: ['sway_area', 'time_held', 'deviation'],
    ageAdjusted: true,
  },
  ROM: {
    id: 'ROM',
    displayName: 'Range of Motion',
    tests: ['FA1', 'FA2', 'FA3', 'FA4', 'FA5'],
    metrics: ['degrees', 'asymmetry_ratio'],
    ageAdjusted: true,
  },
  MOB: {
    id: 'MOB',
    displayName: 'Mobility',
    tests: ['NN1', 'NN2', 'NN3', 'NN4', 'NN5'],
    metrics: ['fluidity_score', 'range_degrees'],
    ageAdjusted: true,
  },
  REF: {
    id: 'REF',
    displayName: 'Reflexes & Reaction',
    tests: ['KS1', 'KS2', 'KS3'],
    metrics: ['reaction_time_ms', 'accuracy_percent'],
    ageAdjusted: true,
  },
  STR: {
    id: 'STR',
    displayName: 'Strength',
    tests: [],
    metrics: ['force_kg', 'endurance_seconds'],
    ageAdjusted: true,
  },
  FLEX: {
    id: 'FLEX',
    displayName: 'Flexibility',
    tests: [],
    metrics: ['reach_cm', 'range_degrees'],
    ageAdjusted: true,
  },
  POST: {
    id: 'POST',
    displayName: 'Posture',
    tests: [],
    metrics: ['deviation_degrees', 'symmetry_score'],
    ageAdjusted: false,
  },
};

/**
 * Get parameter definition by ID.
 */
export function getParameter(parameterId: string): AssessmentParameterDef | null {
  return ASSESSMENT_PARAMETERS[parameterId] ?? null;
}

/**
 * Find which parameter a game tests.
 */
export function getParameterForGame(gameId: string): string | null {
  for (const param of Object.values(ASSESSMENT_PARAMETERS)) {
    if (param.tests.includes(gameId)) return param.id;
  }
  return null;
}
