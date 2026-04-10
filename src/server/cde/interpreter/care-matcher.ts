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

  // ─── Neck / Cervical Spine Pathways ───

  {
    id: 'cp_neck_self_manage',
    name: 'Neck Pain — Self-Guided Recovery',
    description:
      'A self-guided program with targeted neck exercises and posture education. Ideal for mild, recent-onset neck pain with no neurological symptoms.',
    targetConditions: [
      'neck_postural',
      'neck_muscle',
      'hyp_neck_postural',
      'hyp_neck_muscle',
    ],
    targetRiskLevels: ['GREEN', 'BLUE'],
    durationWeeks: 4,
    providerTypes: [],
    phases: [
      {
        phase: 1,
        name: 'Pain Relief & Gentle Mobility',
        weeks: [1, 2],
        goals: ['Reduce pain to <3/10', 'Restore comfortable range of motion'],
        exerciseTypes: ['gentle_mobility', 'breathing', 'posture_correction'],
        reassessmentGames: ['FA3', 'KS3'],
      },
      {
        phase: 2,
        name: 'Strengthening & Posture',
        weeks: [3, 4],
        goals: ['Cervical stabiliser activation', 'Sustainable posture habits'],
        exerciseTypes: ['deep_neck_flexor', 'scapular_stability', 'progressive_loading'],
        reassessmentGames: ['FA3', 'KS3', 'KS4', 'BB1'],
      },
    ],
    escalationTriggers: [
      'severity_increases_by_2_or_more',
      'new_arm_tingling_or_numbness',
      'no_improvement_after_2_weeks',
    ],
    escalationPathway: 'cp_neck_guided_rehab',
  },
  {
    id: 'cp_neck_guided_rehab',
    name: 'Neck Pain — Guided Rehabilitation',
    description:
      'Physiotherapist-guided program combining manual therapy, exercise, and education. For moderate neck pain, cervicogenic headache, or disc-related presentations.',
    targetConditions: [
      'neck_postural',
      'neck_muscle',
      'neck_ddd',
      'neck_disc',
      'neck_cervicogenic_headache',
      'neck_cervicogenic_dizziness',
      'neck_cervical_oa',
      'neck_as',
      'hyp_neck_postural',
      'hyp_neck_muscle',
      'hyp_neck_ddd',
      'hyp_neck_disc',
      'hyp_neck_cervicogenic_headache',
      'hyp_neck_cervicogenic_dizziness',
      'hyp_neck_oa',
      'hyp_neck_as',
      'hyp_neck_instability',
    ],
    targetRiskLevels: ['YELLOW'],
    durationWeeks: 8,
    providerTypes: ['physiotherapist'],
    phases: [
      {
        phase: 1,
        name: 'Assessment & Early Rehab',
        weeks: [1, 3],
        goals: ['Clinical assessment', 'Pain management', 'Begin mobility and stability work'],
        providerSessions: [
          { type: 'physiotherapist', frequency: '2x per week', mode: 'in_person_or_video' },
        ],
        reassessmentGames: ['FA3', 'KS3', 'BB1'],
      },
      {
        phase: 2,
        name: 'Progressive Loading',
        weeks: [4, 6],
        goals: ['Increase cervical strength', 'Improve functional capacity'],
        providerSessions: [{ type: 'physiotherapist', frequency: '1x per week' }],
      },
      {
        phase: 3,
        name: 'Transition to Independence',
        weeks: [7, 8],
        goals: ['Self-management skills', 'Return to full activity'],
        providerSessions: [{ type: 'physiotherapist', frequency: '1x biweekly' }],
      },
    ],
    escalationTriggers: [
      'severity_increases_by_2_or_more',
      'new_neurological_symptoms',
      'no_improvement_after_4_weeks',
    ],
    escalationPathway: 'cp_neck_intensive',
  },
  {
    id: 'cp_neck_intensive',
    name: 'Neck Pain — Multi-disciplinary Programme',
    description:
      'Intensive specialist-led programme for complex cervical presentations including radiculopathy, myelopathy, or high-severity chronic neck pain.',
    targetConditions: [
      'neck_radiculopathy',
      'neck_myelopathy',
      'neck_disc',
      'neck_instability',
      'hyp_neck_radiculopathy',
      'hyp_neck_myelopathy',
      'hyp_neck_disc',
      'hyp_neck_instability',
      'hyp_neck_thoracic_rad',
    ],
    targetRiskLevels: ['ORANGE'],
    durationWeeks: 12,
    providerTypes: ['physiotherapist', 'neurology', 'pain_specialist'],
    phases: [
      {
        phase: 1,
        name: 'Specialist Assessment',
        weeks: [1, 2],
        goals: ['Neurological assessment', 'Imaging if indicated', 'Pain management plan'],
      },
      {
        phase: 2,
        name: 'Intensive Neuro-Rehab',
        weeks: [3, 8],
        goals: ['Structured neural mobilisation', 'Cervical stability', 'Pain education'],
      },
      {
        phase: 3,
        name: 'Return to Function',
        weeks: [9, 12],
        goals: ['Work readiness', 'Activity tolerance', 'Prevention strategy'],
      },
    ],
    escalationTriggers: [
      'surgical_consultation_indicated',
      'progressive_neurological_deficit',
      'failure_to_progress_after_6_weeks',
    ],
    escalationPathway: null,
  },

  // ─── Shoulder Pathways ───

  {
    id: 'cp_shoulder_self_manage',
    name: 'Shoulder Pain — Self-Guided Recovery',
    description:
      'A self-guided exercise program with rotator cuff strengthening and posture education. For mild, recent-onset shoulder pain without neurological features.',
    targetConditions: [
      'hyp_shoulder_soft_tissue',
      'hyp_shoulder_scapular',
      'shoulder_soft_tissue',
      'shoulder_postural',
    ],
    targetRiskLevels: ['GREEN', 'BLUE'],
    durationWeeks: 4,
    providerTypes: [],
    phases: [
      {
        phase: 1,
        name: 'Pain Relief & Gentle Mobility',
        weeks: [1, 2],
        goals: ['Reduce pain to <3/10', 'Restore pain-free range of motion'],
        exerciseTypes: ['pendulum', 'gentle_mobility', 'posture_correction'],
        reassessmentGames: ['FA3', 'KS4'],
      },
      {
        phase: 2,
        name: 'Strengthening',
        weeks: [3, 4],
        goals: ['Rotator cuff activation', 'Scapular stability'],
        exerciseTypes: ['rotator_cuff', 'scapular_stability', 'progressive_loading'],
        reassessmentGames: ['FA3', 'KS4', 'BB1'],
      },
    ],
    escalationTriggers: [
      'severity_increases_by_2_or_more',
      'no_improvement_after_2_weeks',
      'new_neurological_symptoms',
    ],
    escalationPathway: 'cp_shoulder_guided_rehab',
  },
  {
    id: 'cp_shoulder_capsular',
    name: 'Shoulder — Capsular / Frozen Shoulder Programme',
    description:
      'Physiotherapist-led programme with progressive stretching and joint mobilisation. Designed for adhesive capsulitis and significant range-of-motion restriction.',
    targetConditions: [
      'hyp_shoulder_frozen',
      'hyp_shoulder_ac_joint',
      'shoulder_frozen',
      'shoulder_ac_joint',
    ],
    targetRiskLevels: ['YELLOW'],
    durationWeeks: 12,
    providerTypes: ['physiotherapist'],
    phases: [
      {
        phase: 1,
        name: 'Pain Management & Early Mobility',
        weeks: [1, 4],
        goals: ['Pain relief', 'Maintain existing range of motion'],
        providerSessions: [
          { type: 'physiotherapist', frequency: '2x per week', mode: 'in_person_or_video' },
        ],
        reassessmentGames: ['FA3', 'KS3', 'KS4'],
      },
      {
        phase: 2,
        name: 'Progressive Stretching',
        weeks: [5, 8],
        goals: ['Improve range of motion by 20%', 'Reduce stiffness'],
        providerSessions: [{ type: 'physiotherapist', frequency: '1x per week' }],
      },
      {
        phase: 3,
        name: 'Strengthening & Return to Function',
        weeks: [9, 12],
        goals: ['Full ROM restoration', 'Return to overhead activities'],
        providerSessions: [{ type: 'physiotherapist', frequency: '1x biweekly' }],
      },
    ],
    escalationTriggers: [
      'no_improvement_in_range_of_motion_after_6_weeks',
      'severity_increases_by_2_or_more',
    ],
    escalationPathway: 'cp_shoulder_intensive',
  },
  {
    id: 'cp_shoulder_guided_rehab',
    name: 'Shoulder Pain — Guided Rehabilitation',
    description:
      'Physiotherapist-guided program for rotator cuff, impingement, and biceps presentations with exercise and manual therapy.',
    targetConditions: [
      'hyp_shoulder_impingement',
      'hyp_shoulder_rc_tendinopathy',
      'hyp_shoulder_biceps',
      'hyp_shoulder_calcific',
      'hyp_shoulder_scapular',
      'hyp_shoulder_soft_tissue',
      'shoulder_impingement',
      'shoulder_rc_tendinopathy',
      'shoulder_biceps',
    ],
    targetRiskLevels: ['YELLOW'],
    durationWeeks: 8,
    providerTypes: ['physiotherapist'],
    phases: [
      {
        phase: 1,
        name: 'Assessment & Load Management',
        weeks: [1, 3],
        goals: ['Clinical assessment', 'Pain management', 'Begin rotator cuff activation'],
        providerSessions: [
          { type: 'physiotherapist', frequency: '2x per week', mode: 'in_person_or_video' },
        ],
        reassessmentGames: ['FA3', 'KS4', 'BB1'],
      },
      {
        phase: 2,
        name: 'Progressive Strengthening',
        weeks: [4, 6],
        goals: ['Full rotator cuff loading', 'Scapular stability'],
        providerSessions: [{ type: 'physiotherapist', frequency: '1x per week' }],
      },
      {
        phase: 3,
        name: 'Return to Activity',
        weeks: [7, 8],
        goals: ['Overhead function', 'Sport/work readiness'],
        providerSessions: [{ type: 'physiotherapist', frequency: '1x biweekly' }],
      },
    ],
    escalationTriggers: [
      'no_improvement_after_4_weeks',
      'severity_increases_by_2_or_more',
    ],
    escalationPathway: 'cp_shoulder_intensive',
  },
  {
    id: 'cp_shoulder_intensive',
    name: 'Shoulder — Multi-disciplinary Programme',
    description:
      'Specialist-led programme for complex shoulder presentations including instability, cervicogenic referral, or surgical consideration.',
    targetConditions: [
      'hyp_shoulder_instability',
      'hyp_shoulder_cervicogenic',
      'hyp_shoulder_calcific',
      'shoulder_instability',
      'shoulder_cervicogenic',
    ],
    targetRiskLevels: ['ORANGE'],
    durationWeeks: 12,
    providerTypes: ['physiotherapist', 'sports_medicine', 'orthopaedics'],
    phases: [
      {
        phase: 1,
        name: 'Specialist Assessment',
        weeks: [1, 2],
        goals: ['Imaging if indicated', 'Stability assessment', 'Pain management plan'],
      },
      {
        phase: 2,
        name: 'Structured Rehabilitation',
        weeks: [3, 8],
        goals: ['Progressive stability training', 'Neuromuscular re-education'],
      },
      {
        phase: 3,
        name: 'Return to Function',
        weeks: [9, 12],
        goals: ['Sport/work readiness', 'Injury prevention strategy'],
      },
    ],
    escalationTriggers: [
      'surgical_consultation_indicated',
      'failure_to_progress_after_6_weeks',
    ],
    escalationPathway: null,
  },

  // ─── Knee Pathways ───

  {
    id: 'cp_knee_self_manage',
    name: 'Knee Pain — Self-Guided Recovery',
    description:
      'A self-guided program with quadriceps strengthening and activity modification for mild knee pain.',
    targetConditions: [
      'hyp_knee_pfps',
      'hyp_knee_itb',
      'hyp_knee_hoffa',
      'hyp_knee_soft_tissue',
      'knee_pfps',
      'knee_itb',
    ],
    targetRiskLevels: ['GREEN', 'BLUE'],
    durationWeeks: 4,
    providerTypes: [],
    phases: [
      {
        phase: 1,
        name: 'Load Management & Gentle Strengthening',
        weeks: [1, 2],
        goals: ['Reduce pain to <3/10', 'Regain quad activation'],
        exerciseTypes: ['quad_sets', 'straight_leg_raise', 'cycling'],
        reassessmentGames: ['NN1', 'BB1'],
      },
      {
        phase: 2,
        name: 'Progressive Loading',
        weeks: [3, 4],
        goals: ['Single leg capacity', 'Return to walking/stairs'],
        exerciseTypes: ['squats', 'step_ups', 'lateral_band_walks'],
        reassessmentGames: ['NN1', 'BB1', 'BB2'],
      },
    ],
    escalationTriggers: [
      'severity_increases_by_2_or_more',
      'new_swelling_or_locking',
      'no_improvement_after_2_weeks',
    ],
    escalationPathway: 'cp_knee_guided_rehab',
  },
  {
    id: 'cp_knee_ligament_rehab',
    name: 'Knee — Ligament & Meniscal Rehabilitation',
    description:
      'Structured physiotherapist-led programme for ligament sprains, meniscal injuries, and mechanical knee presentations.',
    targetConditions: [
      'hyp_knee_meniscal_med',
      'hyp_knee_meniscal_lat',
      'hyp_knee_mcl',
      'hyp_knee_lcl',
      'hyp_knee_acl',
      'hyp_knee_pcl',
      'knee_meniscal',
      'knee_ligament',
    ],
    targetRiskLevels: ['YELLOW', 'ORANGE'],
    durationWeeks: 12,
    providerTypes: ['physiotherapist'],
    phases: [
      {
        phase: 1,
        name: 'Acute Management',
        weeks: [1, 3],
        goals: ['Swelling control', 'Weight-bearing restoration', 'ROM recovery'],
        providerSessions: [
          { type: 'physiotherapist', frequency: '2x per week', mode: 'in_person_or_video' },
        ],
        reassessmentGames: ['NN1', 'BB1', 'BB2'],
      },
      {
        phase: 2,
        name: 'Strength & Stability',
        weeks: [4, 8],
        goals: ['Quadriceps and hamstring symmetry', 'Dynamic stability'],
        providerSessions: [{ type: 'physiotherapist', frequency: '1x per week' }],
      },
      {
        phase: 3,
        name: 'Return to Sport/Activity',
        weeks: [9, 12],
        goals: ['Sport-specific drills', 'Confidence under load'],
        providerSessions: [{ type: 'physiotherapist', frequency: '1x biweekly' }],
      },
    ],
    escalationTriggers: [
      'persistent_instability',
      'failure_to_progress_after_6_weeks',
      'surgical_consultation_indicated',
    ],
    escalationPathway: null,
  },
  {
    id: 'cp_knee_guided_rehab',
    name: 'Knee Pain — Guided Rehabilitation',
    description:
      'Physiotherapist-guided program for patellar tendinopathy, OA, and overuse knee presentations.',
    targetConditions: [
      'hyp_knee_patellar_tend',
      'hyp_knee_oa',
      'hyp_knee_plica',
      'hyp_knee_bakers',
      'hyp_knee_osgood',
      'knee_oa',
      'knee_tendinopathy',
    ],
    targetRiskLevels: ['YELLOW'],
    durationWeeks: 8,
    providerTypes: ['physiotherapist'],
    phases: [
      {
        phase: 1,
        name: 'Load Reduction & Assessment',
        weeks: [1, 3],
        goals: ['Pain management', 'Isometric loading', 'Gait assessment'],
        providerSessions: [
          { type: 'physiotherapist', frequency: '2x per week', mode: 'in_person_or_video' },
        ],
      },
      {
        phase: 2,
        name: 'Progressive Tendon Loading',
        weeks: [4, 6],
        goals: ['Isotonic and eccentric loading tolerance'],
        providerSessions: [{ type: 'physiotherapist', frequency: '1x per week' }],
      },
      {
        phase: 3,
        name: 'Return to Full Activity',
        weeks: [7, 8],
        goals: ['Sport readiness', 'Load management strategy'],
        providerSessions: [{ type: 'physiotherapist', frequency: '1x biweekly' }],
      },
    ],
    escalationTriggers: [
      'no_improvement_after_4_weeks',
      'severity_increases_by_2_or_more',
    ],
    escalationPathway: 'cp_knee_intensive',
  },
  {
    id: 'cp_knee_intensive',
    name: 'Knee — Multi-disciplinary Programme',
    description:
      'Specialist-led programme for complex knee presentations, OA with high impairment, or post-surgical rehabilitation.',
    targetConditions: [
      'hyp_knee_acl',
      'hyp_knee_oa',
      'knee_surgical',
      'knee_complex',
    ],
    targetRiskLevels: ['ORANGE'],
    durationWeeks: 16,
    providerTypes: ['physiotherapist', 'sports_medicine', 'orthopaedics'],
    phases: [
      {
        phase: 1,
        name: 'Specialist Assessment',
        weeks: [1, 2],
        goals: ['Imaging review', 'Surgical decision pathway', 'Pain management'],
      },
      {
        phase: 2,
        name: 'Intensive Rehabilitation',
        weeks: [3, 10],
        goals: ['Strength symmetry', 'Functional capacity', 'Return to activity milestones'],
      },
      {
        phase: 3,
        name: 'Sport-Specific Return',
        weeks: [11, 16],
        goals: ['Sport return criteria met', 'Prevention programme'],
      },
    ],
    escalationTriggers: ['surgical_consultation_indicated', 'failure_to_progress_after_8_weeks'],
    escalationPathway: null,
  },

  // ─── Hip Pathways ───

  {
    id: 'cp_hip_self_manage',
    name: 'Hip Pain — Self-Guided Recovery',
    description:
      'A self-guided exercise program targeting hip strength, flexibility, and load management for mild hip pain.',
    targetConditions: [
      'hyp_hip_trochanteric',
      'hyp_hip_gluteal',
      'hyp_hip_adductor',
      'hyp_hip_flexor',
      'hyp_hip_snapping',
      'hip_tendinopathy',
    ],
    targetRiskLevels: ['GREEN', 'BLUE'],
    durationWeeks: 4,
    providerTypes: [],
    phases: [
      {
        phase: 1,
        name: 'Load Management & Gentle Strengthening',
        weeks: [1, 2],
        goals: ['Reduce pain to <3/10', 'Restore basic hip mobility'],
        exerciseTypes: ['clams', 'bridges', 'side_lying_abduction'],
        reassessmentGames: ['NN1', 'BB1'],
      },
      {
        phase: 2,
        name: 'Progressive Loading',
        weeks: [3, 4],
        goals: ['Single-leg stability', 'Hip and gluteal strength'],
        exerciseTypes: ['single_leg_squat', 'deadlift_progression', 'lateral_band_walks'],
        reassessmentGames: ['NN1', 'BB1', 'BB2'],
      },
    ],
    escalationTriggers: [
      'severity_increases_by_2_or_more',
      'no_improvement_after_2_weeks',
      'new_groin_pain_or_clicking',
    ],
    escalationPathway: 'cp_hip_guided_rehab',
  },
  {
    id: 'cp_hip_guided_rehab',
    name: 'Hip Pain — Guided Rehabilitation',
    description:
      'Physiotherapist-guided programme for FAI, labral pathology, hip OA, and lumbar-referred hip pain.',
    targetConditions: [
      'hyp_hip_fai',
      'hyp_hip_labral',
      'hyp_hip_oa',
      'hyp_hip_referred',
      'hyp_hip_post_surg',
      'hip_fai',
      'hip_labral',
      'hip_oa',
    ],
    targetRiskLevels: ['YELLOW'],
    durationWeeks: 8,
    providerTypes: ['physiotherapist'],
    phases: [
      {
        phase: 1,
        name: 'Assessment & Symptom Management',
        weeks: [1, 3],
        goals: ['Clinical assessment', 'Pain management', 'ROM restoration'],
        providerSessions: [
          { type: 'physiotherapist', frequency: '2x per week', mode: 'in_person_or_video' },
        ],
        reassessmentGames: ['NN1', 'BB1', 'BB2'],
      },
      {
        phase: 2,
        name: 'Strengthening & Stability',
        weeks: [4, 6],
        goals: ['Hip abductor and external rotator strength', 'Load tolerance'],
        providerSessions: [{ type: 'physiotherapist', frequency: '1x per week' }],
      },
      {
        phase: 3,
        name: 'Functional Return',
        weeks: [7, 8],
        goals: ['Return to walking distance goals', 'Prevent recurrence'],
        providerSessions: [{ type: 'physiotherapist', frequency: '1x biweekly' }],
      },
    ],
    escalationTriggers: [
      'no_improvement_after_4_weeks',
      'severity_increases_by_2_or_more',
    ],
    escalationPathway: 'cp_hip_intensive',
  },
  {
    id: 'cp_hip_intensive',
    name: 'Hip — Multi-disciplinary Programme',
    description:
      'Specialist-led programme for advanced hip OA, post-surgical rehabilitation, or complex FAI/labral pathology.',
    targetConditions: [
      'hyp_hip_oa',
      'hyp_hip_fai',
      'hyp_hip_labral',
      'hyp_hip_post_surg',
      'hip_surgical',
    ],
    targetRiskLevels: ['ORANGE'],
    durationWeeks: 12,
    providerTypes: ['physiotherapist', 'sports_medicine', 'orthopaedics'],
    phases: [
      {
        phase: 1,
        name: 'Specialist Assessment',
        weeks: [1, 2],
        goals: ['Imaging review', 'Surgical decision pathway', 'Pain optimisation'],
      },
      {
        phase: 2,
        name: 'Structured Rehabilitation',
        weeks: [3, 8],
        goals: ['Progressive hip loading', 'Gait normalisation', 'Functional milestones'],
      },
      {
        phase: 3,
        name: 'Return to Full Activity',
        weeks: [9, 12],
        goals: ['Activity tolerance', 'Long-term management strategy'],
      },
    ],
    escalationTriggers: ['surgical_consultation_indicated', 'failure_to_progress_after_6_weeks'],
    escalationPathway: null,
  },

  // ─── Ankle Pathways ───

  {
    id: 'cp_ankle_stability',
    name: 'Ankle — Stability & Proprioception Programme',
    description:
      'Physiotherapist-led programme targeting ankle stability, proprioception, and return to sport for lateral ankle sprain and chronic instability.',
    targetConditions: [
      'hyp_ankle_lateral_sprain',
      'hyp_ankle_instability',
      'hyp_ankle_sinus_tarsi',
      'hyp_ankle_peroneal',
      'ankle_sprain',
      'ankle_instability',
    ],
    targetRiskLevels: ['YELLOW'],
    durationWeeks: 8,
    providerTypes: ['physiotherapist'],
    phases: [
      {
        phase: 1,
        name: 'Acute Management',
        weeks: [1, 2],
        goals: ['Swelling control', 'Protected weight-bearing', 'Pain management'],
        providerSessions: [
          { type: 'physiotherapist', frequency: '2x per week', mode: 'in_person_or_video' },
        ],
        reassessmentGames: ['NN1', 'BB2'],
      },
      {
        phase: 2,
        name: 'Proprioception & Strength',
        weeks: [3, 6],
        goals: ['Single-leg balance >30s', 'Peroneal strength', 'Gait normalisation'],
        providerSessions: [{ type: 'physiotherapist', frequency: '1x per week' }],
      },
      {
        phase: 3,
        name: 'Return to Sport',
        weeks: [7, 8],
        goals: ['Hop testing symmetry', 'Sport-specific drills'],
        providerSessions: [{ type: 'physiotherapist', frequency: '1x biweekly' }],
      },
    ],
    escalationTriggers: [
      'persistent_instability_after_4_weeks',
      'failure_to_progress_after_4_weeks',
    ],
    escalationPathway: 'cp_ankle_intensive',
  },
  {
    id: 'cp_ankle_self_manage',
    name: 'Ankle Pain — Self-Guided Recovery',
    description:
      'A self-guided programme with targeted ankle exercises for mild Achilles tendinopathy, plantar fascia, and overuse conditions.',
    targetConditions: [
      'hyp_ankle_achilles',
      'hyp_ankle_plantar',
      'hyp_ankle_mortons',
      'ankle_achilles',
      'ankle_plantar',
    ],
    targetRiskLevels: ['GREEN', 'BLUE'],
    durationWeeks: 6,
    providerTypes: [],
    phases: [
      {
        phase: 1,
        name: 'Load Management',
        weeks: [1, 2],
        goals: ['Pain relief', 'Isometric calf loading'],
        exerciseTypes: ['isometric_calf', 'towel_stretch', 'calf_raise'],
        reassessmentGames: ['NN1', 'BB2'],
      },
      {
        phase: 2,
        name: 'Progressive Tendon Loading',
        weeks: [3, 6],
        goals: ['Eccentric loading tolerance', 'Return to walking/running'],
        exerciseTypes: ['eccentric_heel_drop', 'single_leg_calf', 'hopping_progression'],
        reassessmentGames: ['NN1', 'BB2', 'FA1'],
      },
    ],
    escalationTriggers: [
      'no_improvement_after_3_weeks',
      'severity_increases_by_2_or_more',
    ],
    escalationPathway: 'cp_ankle_stability',
  },
  {
    id: 'cp_ankle_guided_rehab',
    name: 'Ankle Pain — Guided Rehabilitation',
    description:
      'Physiotherapist-guided programme for PTTD, OA, and complex foot-ankle presentations.',
    targetConditions: [
      'hyp_ankle_pttd',
      'hyp_ankle_oa',
      'hyp_ankle_stress_fx',
      'ankle_pttd',
      'ankle_oa',
    ],
    targetRiskLevels: ['YELLOW'],
    durationWeeks: 8,
    providerTypes: ['physiotherapist'],
    phases: [
      {
        phase: 1,
        name: 'Assessment & Orthotic Management',
        weeks: [1, 3],
        goals: ['Biomechanical assessment', 'Orthotic prescription if needed', 'Pain management'],
        providerSessions: [
          { type: 'physiotherapist', frequency: '2x per week', mode: 'in_person_or_video' },
        ],
      },
      {
        phase: 2,
        name: 'Strengthening & Alignment',
        weeks: [4, 6],
        goals: ['Tibialis posterior strength', 'Arch control', 'Gait efficiency'],
        providerSessions: [{ type: 'physiotherapist', frequency: '1x per week' }],
      },
      {
        phase: 3,
        name: 'Return to Function',
        weeks: [7, 8],
        goals: ['Activity tolerance', 'Long-term foot care strategy'],
        providerSessions: [{ type: 'physiotherapist', frequency: '1x biweekly' }],
      },
    ],
    escalationTriggers: ['no_improvement_after_4_weeks', 'severity_increases_by_2_or_more'],
    escalationPathway: 'cp_ankle_intensive',
  },
  {
    id: 'cp_ankle_intensive',
    name: 'Ankle — Multi-disciplinary Programme',
    description:
      'Specialist-led programme for complex instability, stress fractures, or post-surgical ankle rehabilitation.',
    targetConditions: [
      'hyp_ankle_instability',
      'hyp_ankle_stress_fx',
      'hyp_ankle_oa',
      'ankle_surgical',
    ],
    targetRiskLevels: ['ORANGE'],
    durationWeeks: 12,
    providerTypes: ['physiotherapist', 'sports_medicine', 'orthopaedics'],
    phases: [
      {
        phase: 1,
        name: 'Specialist Assessment',
        weeks: [1, 2],
        goals: ['Imaging review', 'Surgical decision if needed', 'Acute management'],
      },
      {
        phase: 2,
        name: 'Structured Rehabilitation',
        weeks: [3, 8],
        goals: ['Progressive loading', 'Stability milestones', 'Gait normalisation'],
      },
      {
        phase: 3,
        name: 'Return to Sport/Activity',
        weeks: [9, 12],
        goals: ['Hop testing criteria', 'Sport return clearance'],
      },
    ],
    escalationTriggers: ['surgical_consultation_indicated', 'failure_to_progress_after_6_weeks'],
    escalationPathway: null,
  },

  // ─── Elbow Pathways ───

  {
    id: 'cp_elbow_self_manage',
    name: 'Elbow Pain — Self-Guided Recovery',
    description:
      'A self-guided programme with progressive tendon loading for mild tennis elbow, golfer\'s elbow, and soft tissue presentations.',
    targetConditions: [
      'hyp_elbow_tennis',
      'hyp_elbow_golfers',
      'hyp_elbow_soft_tissue',
      'elbow_tendinopathy',
    ],
    targetRiskLevels: ['GREEN', 'BLUE'],
    durationWeeks: 6,
    providerTypes: [],
    phases: [
      {
        phase: 1,
        name: 'Load Management',
        weeks: [1, 2],
        goals: ['Pain relief', 'Isometric wrist loading'],
        exerciseTypes: ['isometric_wrist_ext', 'eccentric_wrist_ext', 'grip_strengthening'],
        reassessmentGames: ['FA3', 'KS4'],
      },
      {
        phase: 2,
        name: 'Progressive Tendon Loading',
        weeks: [3, 6],
        goals: ['Isotonic tolerance', 'Return to sport/work activities'],
        exerciseTypes: ['theraband_exercises', 'forearm_pronation_supination', 'wrist_curl'],
        reassessmentGames: ['FA3', 'KS4', 'BB1'],
      },
    ],
    escalationTriggers: [
      'no_improvement_after_3_weeks',
      'severity_increases_by_2_or_more',
      'new_numbness_or_tingling',
    ],
    escalationPathway: 'cp_elbow_guided_rehab',
  },
  {
    id: 'cp_elbow_guided_rehab',
    name: 'Elbow Pain — Guided Rehabilitation',
    description:
      'Physiotherapist-guided programme for nerve entrapments, ligament injuries, and bursitis with manual therapy and progressive exercise.',
    targetConditions: [
      'hyp_elbow_ulnar',
      'hyp_elbow_pronator',
      'hyp_elbow_radial_tunnel',
      'hyp_elbow_bursitis',
      'hyp_elbow_ucl',
      'hyp_elbow_rcl',
      'hyp_elbow_impingement',
      'elbow_nerve',
      'elbow_ligament',
    ],
    targetRiskLevels: ['YELLOW'],
    durationWeeks: 8,
    providerTypes: ['physiotherapist'],
    phases: [
      {
        phase: 1,
        name: 'Assessment & Nerve/Tissue Management',
        weeks: [1, 3],
        goals: ['Neural tension management', 'Pain control', 'Activity modification'],
        providerSessions: [
          { type: 'physiotherapist', frequency: '2x per week', mode: 'in_person_or_video' },
        ],
      },
      {
        phase: 2,
        name: 'Progressive Strengthening',
        weeks: [4, 6],
        goals: ['Forearm and grip strength', 'Elbow stability'],
        providerSessions: [{ type: 'physiotherapist', frequency: '1x per week' }],
      },
      {
        phase: 3,
        name: 'Return to Function',
        weeks: [7, 8],
        goals: ['Full activity tolerance', 'Ergonomic strategy'],
        providerSessions: [{ type: 'physiotherapist', frequency: '1x biweekly' }],
      },
    ],
    escalationTriggers: ['no_improvement_after_4_weeks', 'progressive_neurological_deficit'],
    escalationPathway: 'cp_elbow_intensive',
  },
  {
    id: 'cp_elbow_intensive',
    name: 'Elbow — Multi-disciplinary Programme',
    description:
      'Specialist-led programme for complex nerve entrapments, ligament reconstruction, or refractory tendinopathy.',
    targetConditions: [
      'hyp_elbow_ulnar',
      'hyp_elbow_radial_tunnel',
      'hyp_elbow_chronic_lig',
      'hyp_elbow_acute_lig',
      'elbow_surgical',
    ],
    targetRiskLevels: ['ORANGE'],
    durationWeeks: 12,
    providerTypes: ['physiotherapist', 'sports_medicine', 'orthopaedics'],
    phases: [
      {
        phase: 1,
        name: 'Specialist Assessment',
        weeks: [1, 2],
        goals: ['Nerve conduction study if indicated', 'Surgical decision', 'Pain management'],
      },
      {
        phase: 2,
        name: 'Intensive Rehab',
        weeks: [3, 8],
        goals: ['Neural mobilisation', 'Progressive loading', 'Return to function milestones'],
      },
      {
        phase: 3,
        name: 'Return to Sport/Work',
        weeks: [9, 12],
        goals: ['Activity clearance', 'Ergonomic and technique modifications'],
      },
    ],
    escalationTriggers: ['surgical_consultation_indicated', 'failure_to_progress_after_6_weeks'],
    escalationPathway: null,
  },

  // ─── Wrist / Hand Pathways ───

  {
    id: 'cp_hand_therapy',
    name: 'Wrist & Hand — Specialist Hand Therapy',
    description:
      'Specialist hand therapy programme for CTS, De Quervain\'s, TFCC, trigger finger, and Dupuytren\'s with splinting and targeted exercise.',
    targetConditions: [
      'hyp_wrist_cts',
      'hyp_wrist_dequervain',
      'hyp_wrist_tfcc',
      'hyp_wrist_trigger',
      'hyp_wrist_dupuytren',
      'hyp_wrist_cmc_oa',
      'wrist_cts',
      'wrist_dequervain',
      'wrist_tfcc',
    ],
    targetRiskLevels: ['YELLOW'],
    durationWeeks: 8,
    providerTypes: ['hand_therapist', 'physiotherapist'],
    phases: [
      {
        phase: 1,
        name: 'Splinting & Symptom Management',
        weeks: [1, 3],
        goals: ['Night splint provision', 'Neural tension relief', 'Activity modification'],
        providerSessions: [
          { type: 'hand_therapist', frequency: '2x per week', mode: 'in_person_or_video' },
        ],
        reassessmentGames: ['FA3', 'KS4'],
      },
      {
        phase: 2,
        name: 'Mobilisation & Strengthening',
        weeks: [4, 6],
        goals: ['Tendon gliding', 'Grip and pinch strength', 'Sensory re-education'],
        providerSessions: [{ type: 'hand_therapist', frequency: '1x per week' }],
      },
      {
        phase: 3,
        name: 'Return to Function',
        weeks: [7, 8],
        goals: ['Fine motor recovery', 'Work/ADL tolerance', 'Self-management strategy'],
        providerSessions: [{ type: 'hand_therapist', frequency: '1x biweekly' }],
      },
    ],
    escalationTriggers: [
      'no_improvement_after_4_weeks',
      'progressive_neurological_deficit',
      'surgical_consultation_indicated',
    ],
    escalationPathway: 'cp_wrist_intensive',
  },
  {
    id: 'cp_wrist_self_manage',
    name: 'Wrist & Hand — Self-Guided Recovery',
    description:
      'A self-guided programme with gentle wrist exercises and activity modification for mild wrist tendinopathy, ganglion, and soft tissue conditions.',
    targetConditions: [
      'hyp_wrist_ganglion',
      'hyp_wrist_soft_tissue',
      'hyp_wrist_tendinopathy',
      'wrist_tendinopathy',
      'wrist_ganglion',
    ],
    targetRiskLevels: ['GREEN', 'BLUE'],
    durationWeeks: 4,
    providerTypes: [],
    phases: [
      {
        phase: 1,
        name: 'Symptom Relief',
        weeks: [1, 2],
        goals: ['Pain relief', 'Range of motion restoration'],
        exerciseTypes: ['wrist_circles', 'tendon_gliding', 'grip_strengthening'],
        reassessmentGames: ['FA3', 'KS4'],
      },
      {
        phase: 2,
        name: 'Progressive Loading',
        weeks: [3, 4],
        goals: ['Return to ADL tolerance', 'Prevent recurrence'],
        exerciseTypes: ['wrist_curl', 'forearm_rotation', 'resistance_band'],
        reassessmentGames: ['FA3', 'KS4', 'BB1'],
      },
    ],
    escalationTriggers: [
      'no_improvement_after_2_weeks',
      'severity_increases_by_2_or_more',
      'new_numbness_or_tingling',
    ],
    escalationPathway: 'cp_hand_therapy',
  },
  {
    id: 'cp_wrist_guided_rehab',
    name: 'Wrist & Hand — Guided Rehabilitation',
    description:
      'Physiotherapist-guided programme for wrist ligament injuries, arthritis, and complex tendon presentations.',
    targetConditions: [
      'hyp_wrist_acute_lig',
      'hyp_wrist_chronic_lig',
      'hyp_wrist_arthritis',
      'wrist_ligament',
      'wrist_arthritis',
    ],
    targetRiskLevels: ['YELLOW'],
    durationWeeks: 8,
    providerTypes: ['physiotherapist'],
    phases: [
      {
        phase: 1,
        name: 'Assessment & Immobilisation Management',
        weeks: [1, 3],
        goals: ['Ligament protection', 'ROM preservation', 'Pain management'],
        providerSessions: [
          { type: 'physiotherapist', frequency: '2x per week', mode: 'in_person_or_video' },
        ],
      },
      {
        phase: 2,
        name: 'Progressive Mobility & Strength',
        weeks: [4, 6],
        goals: ['Wrist stability', 'Grip and pinch strength', 'Functional tasks'],
        providerSessions: [{ type: 'physiotherapist', frequency: '1x per week' }],
      },
      {
        phase: 3,
        name: 'Return to Activity',
        weeks: [7, 8],
        goals: ['Work tolerance', 'Sport readiness', 'Long-term joint protection'],
        providerSessions: [{ type: 'physiotherapist', frequency: '1x biweekly' }],
      },
    ],
    escalationTriggers: ['no_improvement_after_4_weeks', 'severity_increases_by_2_or_more'],
    escalationPathway: 'cp_wrist_intensive',
  },
  {
    id: 'cp_wrist_intensive',
    name: 'Wrist & Hand — Multi-disciplinary Programme',
    description:
      'Specialist-led programme for complex wrist conditions requiring surgical consideration or advanced hand therapy.',
    targetConditions: [
      'hyp_wrist_cts',
      'hyp_wrist_tfcc',
      'hyp_wrist_dupuytren',
      'hyp_wrist_chronic_lig',
      'wrist_surgical',
    ],
    targetRiskLevels: ['ORANGE'],
    durationWeeks: 12,
    providerTypes: ['hand_therapist', 'orthopaedics', 'physiotherapist'],
    phases: [
      {
        phase: 1,
        name: 'Specialist Assessment',
        weeks: [1, 2],
        goals: ['Nerve conduction / imaging', 'Surgical decision pathway', 'Pain management'],
      },
      {
        phase: 2,
        name: 'Intensive Rehabilitation',
        weeks: [3, 8],
        goals: ['Post-surgical or conservative rehab', 'Sensory recovery', 'Grip restoration'],
      },
      {
        phase: 3,
        name: 'Return to Work/Activity',
        weeks: [9, 12],
        goals: ['ADL independence', 'Work clearance', 'Prevention strategy'],
      },
    ],
    escalationTriggers: ['surgical_consultation_indicated', 'failure_to_progress_after_6_weeks'],
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

  // ── Region-based prefix map for fallback when hypotheses are empty ──
  // Prevents the algorithm from matching ALL pathways when no hypotheses exist,
  // which would cause the first pathway in the array (LBP) to win by default.
  const bodyRegion = (factStore.bodyRegion as string | undefined) ?? '';
  const REGION_TO_PATHWAY_PREFIXES: Record<string, string[]> = {
    wrist: ['cp_wrist', 'cp_hand'],
    wrist_hand: ['cp_wrist', 'cp_hand'],
    hand: ['cp_wrist', 'cp_hand'],
    knee: ['cp_knee'],
    knee_left: ['cp_knee'],
    knee_right: ['cp_knee'],
    hip: ['cp_hip'],
    hip_left: ['cp_hip'],
    hip_right: ['cp_hip'],
    ankle: ['cp_ankle'],
    ankle_left: ['cp_ankle'],
    ankle_right: ['cp_ankle'],
    shoulder: ['cp_shoulder'],
    shoulder_left: ['cp_shoulder'],
    shoulder_right: ['cp_shoulder'],
    elbow: ['cp_elbow'],
    elbow_left: ['cp_elbow'],
    elbow_right: ['cp_elbow'],
    neck: ['cp_neck'],
    cervical_spine: ['cp_neck'],
    lumbar_spine: ['cp_lbp'],
    lower_back: ['cp_lbp'],
    back: ['cp_lbp'],
  };
  const regionPrefixes = REGION_TO_PATHWAY_PREFIXES[bodyRegion] ?? [];

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
    // Priority order:
    //   a) Hypotheses available → match against conditionId
    //   b) No hypotheses but body region known → restrict to region-prefixed pathways
    //      (safety net: prevents defaulting to LBP pathways when hypotheses are empty)
    //   c) No hypotheses and no region → allow all (graceful degradation only)
    let conditionMatch: boolean;
    if (activeConditions.length > 0) {
      conditionMatch = activeConditions.some((c) => pathway.targetConditions.includes(c));
    } else if (regionPrefixes.length > 0) {
      conditionMatch = regionPrefixes.some((prefix) => pathway.id.startsWith(prefix));
    } else {
      conditionMatch = true;
    }

    if (!conditionMatch) {
      continue;
    }
    score += 10;
    reasons.push('Condition match');

    // Factor 2 — Risk level (spec: exact +8, ±1 tier +4, ±2 tiers = skip)
    if (pathway.targetRiskLevels.includes(riskLevel)) {
      score += 8;
      reasons.push(`Risk level exact match (${riskLevel})`);
    } else if (isAdjacentRisk(riskLevel, pathway.targetRiskLevels)) {
      score += 4; // spec: ±1 tier = +4
      reasons.push('Risk level adjacent match (+1 tier)');
    } else {
      continue; // risk level too far off — skip
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

    // Factor 5 — Assessment coverage bonus (spec: game scores available for pathway params ×5)
    if (gameScorePercentiles) {
      const percentiles = Object.values(gameScorePercentiles);
      const avgPercentile =
        percentiles.length > 0
          ? percentiles.reduce((a, b) => a + b, 0) / percentiles.length
          : 50;

      // Coverage bonus: having game data to justify this pathway (+5 per spec)
      if (percentiles.length > 0) {
        score += 5;
        reasons.push('Assessment data available for pathway recommendation');
      }

      // Additional alignment bonuses from game score patterns
      if (avgPercentile < 25 && pathway.id.includes('guided')) {
        score += 2;
        reasons.push('Low scores support guided care recommendation');
      }
      if (avgPercentile < 10 && pathway.id.includes('intensive')) {
        score += 2;
        reasons.push('Very low scores support intensive care');
      }
      if (avgPercentile > 60 && pathway.id.includes('self_manage')) {
        score += 2;
        reasons.push('Adequate function scores support self-management');
      }
    }

    // Factor 6 — Contradiction penalty (spec: -20 for contraindicated pathway)
    // A pathway is contraindicated if it requires high-demand activity while
    // the condition explicitly blocks it (e.g. myelopathy + intensive squat-heavy programme)
    const myelopathyConditions = ['hyp_neck_myelopathy', 'neck_myelopathy'];
    const hasMyelopathy = activeConditions.some((c) => myelopathyConditions.includes(c));
    if (hasMyelopathy && pathway.id.includes('intensive') && pathway.providerTypes.includes('neurology')) {
      // Myelopathy SHOULD go intensive — not contraindicated; no penalty
    } else if (hasMyelopathy && pathway.id.includes('self_manage')) {
      score -= 20;
      reasons.push('Contradiction: myelopathy requires supervised care, not self-manage');
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
