/**
 * Game Catalog — Single source of truth for all 13 Kriya CV assessment games.
 * Used by: game-recommender, score-interpreter, contraindications, UI.
 */

import type { GameSpec } from '@/types/cde';

export const GAME_CATALOG: Record<string, GameSpec> = {
  // ═══ Balance (BAL) — BB1-BB4 ═══
  BB1: {
    id: 'BB1',
    parameter: 'BAL',
    parameterDisplayName: 'Balance (static)',
    avgDurationSeconds: 40,
    intensity: 'low',
    bilateral: true,
    minPossibleScore: 0,
    maxPossibleScore: 100,
    expectedDurationRange: [20, 90],
    patientInstructions: 'Stand on one leg with your eyes open. Hold as still as possible.',
  },
  BB2: {
    id: 'BB2',
    parameter: 'BAL',
    parameterDisplayName: 'Balance (dynamic)',
    avgDurationSeconds: 45,
    intensity: 'low',
    bilateral: true,
    minPossibleScore: 0,
    maxPossibleScore: 100,
    expectedDurationRange: [25, 90],
    patientInstructions: 'Follow the balance target on screen while standing on one leg.',
  },
  BB3: {
    id: 'BB3',
    parameter: 'BAL',
    parameterDisplayName: 'Balance (eyes closed)',
    avgDurationSeconds: 30,
    intensity: 'low',
    bilateral: true,
    minPossibleScore: 0,
    maxPossibleScore: 100,
    expectedDurationRange: [15, 60],
    patientInstructions: 'Stand on one leg with your eyes closed. Hold as still as possible.',
  },
  BB4: {
    id: 'BB4',
    parameter: 'BAL',
    parameterDisplayName: 'Balance (tandem)',
    avgDurationSeconds: 35,
    intensity: 'low',
    bilateral: false,
    minPossibleScore: 0,
    maxPossibleScore: 100,
    expectedDurationRange: [20, 70],
    patientInstructions: 'Stand heel-to-toe and hold your balance.',
  },

  // ═══ Mobility (MOB) — NN1-NN5 ═══
  NN1: {
    id: 'NN1',
    parameter: 'MOB',
    parameterDisplayName: 'Spinal mobility (flexion)',
    avgDurationSeconds: 45,
    intensity: 'moderate',
    bilateral: false,
    minPossibleScore: 0,
    maxPossibleScore: 100,
    expectedDurationRange: [25, 90],
    patientInstructions: 'Slowly bend forward reaching toward your toes, then return upright.',
  },
  NN2: {
    id: 'NN2',
    parameter: 'MOB',
    parameterDisplayName: 'Spinal mobility (rotation)',
    avgDurationSeconds: 40,
    intensity: 'low',
    bilateral: true,
    minPossibleScore: 0,
    maxPossibleScore: 100,
    expectedDurationRange: [20, 80],
    patientInstructions: 'Rotate your upper body left and right while keeping your hips still.',
  },
  NN3: {
    id: 'NN3',
    parameter: 'MOB',
    parameterDisplayName: 'Spinal mobility (lateral)',
    avgDurationSeconds: 40,
    intensity: 'low',
    bilateral: true,
    minPossibleScore: 0,
    maxPossibleScore: 100,
    expectedDurationRange: [20, 80],
    patientInstructions: 'Bend sideways to the left and right, sliding your hand down your leg.',
  },
  NN4: {
    id: 'NN4',
    parameter: 'MOB',
    parameterDisplayName: 'Neck mobility',
    avgDurationSeconds: 35,
    intensity: 'low',
    bilateral: true,
    minPossibleScore: 0,
    maxPossibleScore: 100,
    expectedDurationRange: [20, 70],
    patientInstructions: 'Turn your head left and right as far as comfortable.',
  },
  NN5: {
    id: 'NN5',
    parameter: 'MOB',
    parameterDisplayName: 'Full body mobility',
    avgDurationSeconds: 60,
    intensity: 'high',
    bilateral: true,
    minPossibleScore: 0,
    maxPossibleScore: 100,
    expectedDurationRange: [30, 120],
    patientInstructions: 'Perform the full body movement sequence shown on screen.',
  },

  // ═══ Range of Motion (ROM) — FA1-FA5 ═══
  FA1: {
    id: 'FA1',
    parameter: 'ROM',
    parameterDisplayName: 'Forward bend (ROM)',
    avgDurationSeconds: 30,
    intensity: 'moderate',
    bilateral: false,
    minPossibleScore: 0,
    maxPossibleScore: 180,
    expectedDurationRange: [15, 60],
    patientInstructions: 'Bend forward slowly and reach as far as you can toward your toes.',
  },
  FA2: {
    id: 'FA2',
    parameter: 'ROM',
    parameterDisplayName: 'Side bend (ROM)',
    avgDurationSeconds: 30,
    intensity: 'low',
    bilateral: true,
    minPossibleScore: 0,
    maxPossibleScore: 90,
    expectedDurationRange: [15, 60],
    patientInstructions: 'Bend sideways, sliding your hand down the outside of your leg.',
  },
  FA3: {
    id: 'FA3',
    parameter: 'ROM',
    parameterDisplayName: 'Hip flexion (ROM)',
    avgDurationSeconds: 35,
    intensity: 'low',
    bilateral: true,
    minPossibleScore: 0,
    maxPossibleScore: 135,
    expectedDurationRange: [20, 70],
    patientInstructions: 'Lift your knee toward your chest while standing.',
  },
  FA4: {
    id: 'FA4',
    parameter: 'ROM',
    parameterDisplayName: 'Back extension (ROM)',
    avgDurationSeconds: 30,
    intensity: 'moderate',
    bilateral: false,
    minPossibleScore: 0,
    maxPossibleScore: 45,
    expectedDurationRange: [15, 60],
    patientInstructions: 'Gently lean backward, supporting your lower back with your hands.',
  },
  FA5: {
    id: 'FA5',
    parameter: 'ROM',
    parameterDisplayName: 'Deep squat (ROM)',
    avgDurationSeconds: 40,
    intensity: 'high',
    bilateral: false,
    minPossibleScore: 0,
    maxPossibleScore: 100,
    expectedDurationRange: [20, 80],
    patientInstructions: 'Squat down as deep as you comfortably can, then stand back up.',
  },

  // ═══ Reflexes & Reaction (REF) — KS1-KS3 ═══
  KS1: {
    id: 'KS1',
    parameter: 'REF',
    parameterDisplayName: 'Reaction time',
    avgDurationSeconds: 30,
    intensity: 'low',
    bilateral: true,
    minPossibleScore: 100,
    maxPossibleScore: 1500,
    expectedDurationRange: [15, 60],
    patientInstructions: 'Tap the screen as quickly as possible when the target appears.',
  },
  KS2: {
    id: 'KS2',
    parameter: 'REF',
    parameterDisplayName: 'Coordination',
    avgDurationSeconds: 35,
    intensity: 'low',
    bilateral: true,
    minPossibleScore: 0,
    maxPossibleScore: 100,
    expectedDurationRange: [20, 70],
    patientInstructions: 'Follow the moving target with your finger as accurately as possible.',
  },
  KS3: {
    id: 'KS3',
    parameter: 'REF',
    parameterDisplayName: 'Agility',
    avgDurationSeconds: 40,
    intensity: 'moderate',
    bilateral: true,
    minPossibleScore: 0,
    maxPossibleScore: 100,
    expectedDurationRange: [20, 80],
    patientInstructions: 'Step side to side following the on-screen prompts.',
  },
};

/** Games that require high physical intensity — filtered out for ORANGE risk level */
export const HIGH_INTENSITY_GAMES = new Set<string>(['FA5', 'NN5']);

/** Look up a single game's specification */
export function getGameSpec(gameId: string): GameSpec | null {
  return GAME_CATALOG[gameId] ?? null;
}

/** Get all games that test a specific parameter (e.g., 'BAL' → BB1-BB4) */
export function getGamesByParameter(parameter: string): GameSpec[] {
  return Object.values(GAME_CATALOG).filter((g) => g.parameter === parameter);
}
