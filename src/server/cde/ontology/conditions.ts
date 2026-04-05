/**
 * Conditions — Condition catalog constants
 * Defines all supported MSK conditions with clinical metadata.
 */

export interface ConditionDef {
  id: string;
  displayName: string;
  icd10: string;
  bodyRegion: string;
  redFlagScreenRequired: boolean;
  typicalParametersAffected: string[];
  carePathways: string[];
}

export const CONDITIONS: Record<string, ConditionDef> = {
  non_specific_lbp: {
    id: 'non_specific_lbp',
    displayName: 'Non-Specific Lower Back Pain',
    icd10: 'M54.5',
    bodyRegion: 'lumbar_spine',
    redFlagScreenRequired: true,
    typicalParametersAffected: ['ROM', 'MOB', 'BAL'],
    carePathways: ['cp_lbp_self_manage', 'cp_lbp_guided', 'cp_lbp_intensive'],
  },
  cervical_pain_postural: {
    id: 'cervical_pain_postural',
    displayName: 'Postural Neck Pain',
    icd10: 'M54.2',
    bodyRegion: 'cervical_spine',
    redFlagScreenRequired: true,
    typicalParametersAffected: ['ROM', 'MOB'],
    carePathways: [],
  },
  shoulder_impingement: {
    id: 'shoulder_impingement',
    displayName: 'Shoulder Impingement Syndrome',
    icd10: 'M75.1',
    bodyRegion: 'shoulder',
    redFlagScreenRequired: true,
    typicalParametersAffected: ['ROM', 'STR'],
    carePathways: [],
  },
  disc_herniation_with_radiculopathy: {
    id: 'disc_herniation_with_radiculopathy',
    displayName: 'Disc Herniation with Radiculopathy',
    icd10: 'M51.1',
    bodyRegion: 'lumbar_spine',
    redFlagScreenRequired: true,
    typicalParametersAffected: ['ROM', 'REF', 'BAL'],
    carePathways: ['cp_lbp_guided', 'cp_lbp_intensive'],
  },
  sciatica: {
    id: 'sciatica',
    displayName: 'Sciatica',
    icd10: 'M54.3',
    bodyRegion: 'lumbar_spine',
    redFlagScreenRequired: true,
    typicalParametersAffected: ['ROM', 'REF', 'BAL'],
    carePathways: ['cp_lbp_guided', 'cp_lbp_intensive'],
  },
  osteoarthritis_knee: {
    id: 'osteoarthritis_knee',
    displayName: 'Knee Osteoarthritis',
    icd10: 'M17.1',
    bodyRegion: 'knee',
    redFlagScreenRequired: false,
    typicalParametersAffected: ['ROM', 'BAL', 'STR'],
    carePathways: [],
  },
  spondylosis: {
    id: 'spondylosis',
    displayName: 'Lumbar Spondylosis',
    icd10: 'M47.8',
    bodyRegion: 'lumbar_spine',
    redFlagScreenRequired: true,
    typicalParametersAffected: ['ROM', 'MOB'],
    carePathways: ['cp_lbp_guided', 'cp_lbp_intensive'],
  },
};

/**
 * Get a condition definition by ID.
 */
export function getCondition(conditionId: string): ConditionDef | null {
  return CONDITIONS[conditionId] ?? null;
}
