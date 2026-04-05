/**
 * Care Matcher — Tree 7
 *
 * Multi-factor pathway scoring algorithm:
 *   1. Condition match (HARD requirement — skip if no overlap)
 *   2. Risk level match (exact +8, adjacent +3, too far = skip)
 *   3. Severity alignment
 *   4. Duration alignment
 *   5. Game score alignment (if available)
 *   → Sort by total score ��� top match + up to 2 alternatives
 */

import type { RiskLevel, CareRecommendationData, CarePathway } from '@/types/cde';

// ─── Care Pathway Definitions ───

const CARE_PATHWAYS: CarePathway[] = [
  {
    id: 'cp_lbp_self_manage',
    name: 'Acute Lower Back Pain — Self-Guided',
    description:
      'A self-guided exercise program with weekly automated check-ins. Ideal for mild, recent-onset back pain.',
    targetConditions: [
      'non_specific_lbp',
      'hyp_postural_lbp',
      'hyp_deconditioning',
      'si_joint_dysfunction',
      'hyp_si_joint',
      'piriformis_syndrome',
      'hyp_piriformis',
    ],
    targetRiskLevels: ['GREEN'],
    durationWeeks: 4,
    providerTypes: [],
    phases: [
      {
        phase: 1,
        name: 'Pain Management & Gentle Movement',
        weeks: [1, 2],
        goals: ['Reduce pain to <3/10', 'Restore basic movement confidence'],
        exerciseTypes: ['gentle_mobility', 'breathing', 'walking'],
        reassessmentGames: ['NN1', 'FA1'],
      },
      {
        phase: 2,
        name: 'Strengthening & Flexibility',
        weeks: [3, 4],
        goals: ['Build core stability', 'Improve flexibility by 15%'],
        exerciseTypes: ['core_stability', 'stretching', 'progressive_loading'],
        reassessmentGames: ['NN1', 'FA1', 'FA3', 'BB1'],
      },
    ],
    escalationTriggers: [
      'severity_increases_by_2_or_more',
      'new_neurological_symptoms',
      'no_improvement_after_2_weeks',
    ],
    escalationPathway: 'cp_lbp_guided',
  },
  {
    id: 'cp_lbp_guided',
    name: 'Lower Back Pain — Guided Rehab',
    description:
      'Physiotherapist-guided program with home exercises. For moderate symptoms or those needing professional guidance.',
    targetConditions: [
      'non_specific_lbp',
      'disc_herniation_with_radiculopathy',
      'hyp_postural_lbp',
      'hyp_flexion_intolerant',
      'hyp_extension_intolerant',
      'hyp_deconditioning',
      'hyp_radicular',
      'si_joint_dysfunction',
      'hyp_si_joint',
      'piriformis_syndrome',
      'hyp_piriformis',
    ],
    targetRiskLevels: ['YELLOW'],
    durationWeeks: 8,
    providerTypes: ['physiotherapist'],
    phases: [
      {
        phase: 1,
        name: 'Assessment & Early Rehab',
        weeks: [1, 3],
        goals: ['Clinical assessment', 'Pain management', 'Begin mobility work'],
        providerSessions: [
          { type: 'physiotherapist', frequency: '2x per week', mode: 'in_person_or_video' },
        ],
        reassessmentGames: ['NN1', 'FA1', 'FA3', 'BB1', 'BB2'],
      },
      {
        phase: 2,
        name: 'Progressive Loading',
        weeks: [4, 6],
        goals: ['Increase strength', 'Improve functional capacity'],
        providerSessions: [{ type: 'physiotherapist', frequency: '1x per week' }],
      },
      {
        phase: 3,
        name: 'Transition to Independence',
        weeks: [7, 8],
        goals: ['Self-management skills', 'Maintenance program'],
        providerSessions: [{ type: 'physiotherapist', frequency: '1x biweekly' }],
      },
    ],
    escalationTriggers: [
      'severity_increases_by_2_or_more',
      'new_neurological_symptoms',
      'no_improvement_after_4_weeks',
    ],
    escalationPathway: 'cp_lbp_intensive',
  },
  {
    id: 'cp_lbp_intensive',
    name: 'Lower Back Pain — Multi-disciplinary',
    description:
      'Intensive multi-disciplinary program with specialist consultation. For severe, chronic, or complex presentations.',
    targetConditions: [
      'non_specific_lbp',
      'disc_herniation_with_radiculopathy',
      'hyp_radicular',
      'hyp_flexion_intolerant',
      'hyp_extension_intolerant',
    ],
    targetRiskLevels: ['ORANGE'],
    durationWeeks: 12,
    providerTypes: ['physiotherapist', 'sports_medicine', 'pain_specialist'],
    phases: [
      {
        phase: 1,
        name: 'Comprehensive Assessment',
        weeks: [1, 2],
        goals: ['Full clinical workup', 'Imaging if indicated', 'Pain management plan'],
      },
      {
        phase: 2,
        name: 'Intensive Rehab',
        weeks: [3, 8],
        goals: ['Structured rehabilitation', 'Pain education', 'Graded activity'],
      },
      {
        phase: 3,
        name: 'Return to Function',
        weeks: [9, 12],
        goals: ['Work readiness', 'Sport-specific rehab', 'Prevention strategy'],
      },
    ],
    escalationTriggers: [
      'surgical_consultation_indicated',
      'failure_to_progress_after_6_weeks',
    ],
    escalationPathway: null,
  },
  {
    id: 'cp_general_consultation',
    name: 'Professional Consultation',
    description:
      'We recommend a consultation with a physiotherapist for a comprehensive assessment. Your profile does not clearly match our standard pathways.',
    targetConditions: [],
    targetRiskLevels: ['GREEN', 'YELLOW', 'ORANGE'],
    durationWeeks: 0,
    providerTypes: ['physiotherapist'],
    phases: [],
    escalationTriggers: [],
    escalationPathway: null,
  },
];

// ─── Adjacency helper ───

const RISK_ORDER: RiskLevel[] = ['BLUE', 'GREEN', 'YELLOW', 'ORANGE', 'RED'];

function isAdjacentRisk(level: RiskLevel, targets: RiskLevel[]): boolean {
  const idx = RISK_ORDER.indexOf(level);
  return targets.some((t) => {
    const tIdx = RISK_ORDER.indexOf(t);
    return Math.abs(idx - tIdx) === 1;
  });
}

// ─── Main matcher ───

export function matchCarePathway(
  factStore: Record<string, unknown>,
  hypotheses: Array<{ conditionId: string; displayName: string; confidence: string }>,
  riskLevel: RiskLevel,
  gameScorePercentiles?: Record<string, number>
): CareRecommendationData {
  const activeConditions = hypotheses.map((h) => h.conditionId);

  console.log('[CareMatcher] === MATCHING CARE PATHWAY ===');
  console.log('[CareMatcher] Input hypotheses:', JSON.stringify(hypotheses));
  console.log('[CareMatcher] Input riskLevel:', riskLevel);
  console.log('[CareMatcher] activeConditions:', JSON.stringify(activeConditions));

  const candidates: Array<{
    pathway: CarePathway;
    score: number;
    reasons: string[];
  }> = [];

  for (const pathway of CARE_PATHWAYS) {
    // Skip the general fallback — used only if nothing else matches
    if (pathway.id === 'cp_general_consultation') continue;

    let score = 0;
    const reasons: string[] = [];

    // Factor 1 — Condition match (HARD requirement).
    // If hypotheses is empty, we skip condition check and use risk-only matching.
    const conditionMatch =
      activeConditions.length === 0 ||
      activeConditions.some((c) => pathway.targetConditions.includes(c));

    console.log(`[CareMatcher] Checking pathway: ${pathway.id}`);
    console.log(`[CareMatcher]   targetConditions: ${JSON.stringify(pathway.targetConditions)}`);
    console.log(`[CareMatcher]   conditionMatch: ${conditionMatch}`);

    if (!conditionMatch) {
      console.log(`[CareMatcher]   SKIPPED — no condition overlap`);
      continue;
    }
    score += 10;
    reasons.push('Condition match');

    // Factor 2 — Risk level
    if (pathway.targetRiskLevels.includes(riskLevel)) {
      score += 8;
      reasons.push(`Risk level exact match (${riskLevel})`);
    } else if (isAdjacentRisk(riskLevel, pathway.targetRiskLevels)) {
      score += 3;
      reasons.push('Risk level adjacent match');
    } else {
      continue; // risk level too far off
    }

    // Factor 3 — Severity alignment
    const severity = (factStore.severity as number) ?? 0;
    if (pathway.id.includes('self_manage') && severity < 4) {
      score += 3;
      reasons.push('Low severity fits self-manage');
    }
    if (pathway.id.includes('guided') && severity >= 4 && severity <= 6) {
      score += 3;
      reasons.push('Moderate severity fits guided');
    }
    if (pathway.id.includes('intensive') && severity > 6) {
      score += 3;
      reasons.push('High severity fits intensive');
    }

    // Factor 4 — Duration alignment
    const duration = factStore.duration as string;
    if (
      pathway.id.includes('self_manage') &&
      (duration === 'acute_0_6_weeks' || duration === 'lt_6w')
    ) {
      score += 2;
      reasons.push('Acute duration fits self-manage');
    }
    if (
      pathway.id.includes('intensive') &&
      (duration === 'chronic_over_12_weeks' || duration === 'gt_3m')
    ) {
      score += 2;
      reasons.push('Chronic duration fits intensive');
    }

    // Factor 5 — Game score alignment (if available)
    if (gameScorePercentiles) {
      const percentiles = Object.values(gameScorePercentiles);
      const avgPercentile =
        percentiles.length > 0
          ? percentiles.reduce((a, b) => a + b, 0) / percentiles.length
          : 50;
      if (avgPercentile < 25 && pathway.id.includes('guided')) {
        score += 2;
        reasons.push('Low scores suggest guided care');
      }
      if (avgPercentile < 10 && pathway.id.includes('intensive')) {
        score += 2;
        reasons.push('Very low scores suggest intensive care');
      }
      if (avgPercentile > 50 && pathway.id.includes('self_manage')) {
        score += 2;
        reasons.push('Adequate scores support self-manage');
      }
    }

    candidates.push({ pathway, score, reasons });
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Select top match or fallback
  const fallback = CARE_PATHWAYS.find((p) => p.id === 'cp_general_consultation')!;
  const topMatch = candidates[0] ?? {
    pathway: fallback,
    score: 0,
    reasons: ['No specific pathway matched — recommending general consultation'],
  };

  const alternatives = candidates.slice(1, 3).map((c) => ({
    pathwayId: c.pathway.id,
    name: c.pathway.name,
    description: c.pathway.description,
    score: c.score,
  }));

  return {
    pathwayId: topMatch.pathway.id,
    name: topMatch.pathway.name,
    description: topMatch.pathway.description,
    providerTypes: topMatch.pathway.providerTypes,
    durationWeeks: topMatch.pathway.durationWeeks,
    rationale: topMatch.reasons.join('. ') + '.',
    phases: topMatch.pathway.phases,
    escalationTriggers: topMatch.pathway.escalationTriggers,
    alternatives,
  };
}
