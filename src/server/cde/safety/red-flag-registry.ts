/**
 * Red Flag Registry — Master red flag definitions
 * Contains ALL red flag definitions from the 12 QuickScan PRDs.
 * Organized by urgency tier (IMMEDIATE > URGENT > SPECIALIST).
 */

import type { RedFlagDefinition } from '@/types/cde';

export const RED_FLAG_REGISTRY: RedFlagDefinition[] = [
  // ═══════════════════════════════════════════
  // TIER 1 — IMMEDIATE (call 112)
  // ═══════════════════════════════════════════

  {
    id: 'rf_cauda_equina',
    displayName: 'Cauda Equina Syndrome',
    clinicalConcern: 'Compression of the cauda equina nerve bundle requiring emergency surgical decompression',
    urgency: 'immediate',
    haltMessage: 'Your responses indicate symptoms that could suggest cauda equina syndrome — a condition where nerves at the base of your spine may be under pressure. This requires immediate medical evaluation to prevent lasting damage.',
    haltAction: 'Please call 112 (emergency services) or go to your nearest Accident & Emergency department immediately. Do not wait — early treatment is critical.',
    sourcePrds: ['LBP', 'Sciatica', 'Disc Bulge', 'Spondylosis'],
    requiresCoordination: true,
    coordinatedModules: ['sciatica', 'disc_bulge', 'spondylosis'],
    criteria: {
      ANY: [
        { field: 'bowelBladderChange', equals: true },
        { field: 'redFlags.saddleNumbness', equals: true },
        { field: 'redFlags.bilateralLegWeakness', equals: true },
      ],
    },
  },

  {
    id: 'rf_cervical_myelopathy',
    displayName: 'Cervical Myelopathy',
    clinicalConcern: 'Spinal cord compression in the cervical spine causing progressive neurological deficit',
    urgency: 'immediate',
    haltMessage: 'Your responses suggest symptoms that may indicate pressure on the spinal cord in your neck area. This needs immediate medical assessment to prevent progression.',
    haltAction: 'Please call 112 or go to your nearest A&E immediately. Bring a list of your symptoms and when they started.',
    sourcePrds: ['Neck Pain', 'Disc Bulge', 'Spondylosis'],
    requiresCoordination: true,
    coordinatedModules: ['neck_pain', 'disc_bulge', 'spondylosis'],
    criteria: {
      ALL: [
        { field: 'redFlags.gaitDisturbance', equals: true },
      ],
      ANY: [
        { field: 'redFlags.handClumsiness', equals: true },
        { field: 'redFlags.bilateralArmWeakness', equals: true },
      ],
    },
  },

  {
    id: 'rf_cardiac',
    displayName: 'Cardiac Event',
    clinicalConcern: 'Potential cardiac event presenting as musculoskeletal shoulder/arm pain',
    urgency: 'immediate',
    haltMessage: 'Your symptoms — pain in the left shoulder or arm combined with chest tightness and breathlessness — may indicate a heart-related condition. This needs immediate emergency evaluation.',
    haltAction: 'Call 112 immediately. If you have aspirin available and are not allergic, chew one tablet. Do not drive yourself to hospital.',
    sourcePrds: ['Shoulder Pain'],
    requiresCoordination: false,
    coordinatedModules: [],
    criteria: {
      ALL: [
        { field: 'redFlags.leftShoulderArmPain', equals: true },
      ],
      ANY: [
        { field: 'redFlags.chestTightness', equals: true },
        { field: 'redFlags.breathlessness', equals: true },
        { field: 'redFlags.sweating', equals: true },
      ],
    },
  },

  {
    id: 'rf_septic_arthritis',
    displayName: 'Septic Arthritis',
    clinicalConcern: 'Joint infection requiring emergency antibiotic treatment and possible drainage',
    urgency: 'immediate',
    haltMessage: 'A hot, red, swollen joint with fever may indicate an infection within the joint. This is a medical emergency that requires immediate treatment with antibiotics.',
    haltAction: 'Go to your nearest A&E or call 112 immediately. Do not delay — joint infections can cause permanent damage if not treated quickly.',
    sourcePrds: ['Knee', 'Shoulder', 'OA', 'RA', 'Rotator Cuff', 'Heel & Foot'],
    requiresCoordination: false,
    coordinatedModules: [],
    criteria: {
      ALL: [
        { field: 'redFlags.hotRedSwollenJoint', equals: true },
        { field: 'redFlags.fever', equals: true },
      ],
    },
  },

  {
    id: 'rf_achilles_rupture',
    displayName: 'Achilles Tendon Rupture',
    clinicalConcern: 'Complete or partial Achilles tendon rupture requiring urgent surgical consultation',
    urgency: 'immediate',
    haltMessage: 'A sudden pop at the back of your ankle with inability to push off may indicate an Achilles tendon rupture. This needs urgent medical attention.',
    haltAction: 'Go to A&E as soon as possible. Avoid walking on the affected leg. Apply ice and keep the leg elevated while waiting.',
    sourcePrds: ['Heel & Foot'],
    requiresCoordination: false,
    coordinatedModules: [],
    criteria: {
      ALL: [
        { field: 'redFlags.suddenPop', equals: true },
        { field: 'redFlags.inabilityToPushOff', equals: true },
      ],
    },
  },

  {
    id: 'rf_dvt',
    displayName: 'Deep Vein Thrombosis',
    clinicalConcern: 'Blood clot in deep veins requiring anticoagulation therapy',
    urgency: 'immediate',
    haltMessage: 'Unexplained swelling and redness in your calf without a recent injury may indicate a blood clot. This needs urgent medical evaluation.',
    haltAction: 'Contact your GP immediately for an urgent same-day appointment, or go to A&E. Do not massage the affected area.',
    sourcePrds: ['Knee', 'Heel & Foot'],
    requiresCoordination: false,
    coordinatedModules: [],
    criteria: {
      ALL: [
        { field: 'redFlags.calfSwelling', equals: true },
        { field: 'redFlags.calfRedness', equals: true },
      ],
      NONE: [
        { field: 'redFlags.recentInjury', equals: true },
      ],
    },
  },

  {
    id: 'rf_acute_fracture',
    displayName: 'Acute Fracture',
    clinicalConcern: 'Bone fracture requiring imaging and possible fixation',
    urgency: 'immediate',
    haltMessage: 'Visible deformity and inability to bear weight after an injury suggest a possible fracture. This needs immediate imaging and assessment.',
    haltAction: 'Go to your nearest A&E for X-ray imaging. Do not bear weight on the affected area. Apply ice and immobilize if possible.',
    sourcePrds: ['Knee', 'Shoulder', 'Heel & Foot'],
    requiresCoordination: false,
    coordinatedModules: [],
    criteria: {
      ALL: [
        { field: 'redFlags.deformity', equals: true },
        { field: 'redFlags.cantWeightBear', equals: true },
        { field: 'redFlags.recentTrauma', equals: true },
      ],
    },
  },

  // ═══════════════════════════════════════════
  // TIER 2 — URGENT (24-72 hours)
  // ═══════════════════════════════════════════

  {
    id: 'rf_progressive_neuro',
    displayName: 'Progressive Neurological Deficit',
    clinicalConcern: 'Worsening nerve compression that may require urgent surgical intervention',
    urgency: 'urgent_24h',
    haltMessage: 'Progressive weakness or worsening numbness in your leg suggests increasing pressure on a nerve. This needs urgent specialist review within 24 hours.',
    haltAction: 'Contact your GP for an urgent referral to a spinal specialist, or attend A&E if symptoms worsen rapidly.',
    sourcePrds: ['Sciatica', 'Disc Bulge'],
    requiresCoordination: true,
    coordinatedModules: ['sciatica', 'disc_bulge'],
    criteria: {
      ANY: [
        { field: 'redFlags.worseningFootDrop', equals: true },
        { field: 'redFlags.progressiveWeakness', equals: true },
      ],
    },
  },

  {
    id: 'rf_acute_rotator_cuff_tear',
    displayName: 'Acute Rotator Cuff Tear',
    clinicalConcern: 'Complete rotator cuff tear after trauma requiring surgical consultation',
    urgency: 'urgent_24h',
    haltMessage: 'Sudden inability to raise your arm after an injury may indicate a rotator cuff tear. Early specialist assessment improves treatment outcomes.',
    haltAction: 'See your GP within 24 hours for an urgent orthopaedic referral. Use a sling for comfort and apply ice.',
    sourcePrds: ['Rotator Cuff'],
    requiresCoordination: false,
    coordinatedModules: [],
    criteria: {
      ALL: [
        { field: 'redFlags.suddenInabilityToRaiseArm', equals: true },
        { field: 'redFlags.recentTrauma', equals: true },
      ],
    },
  },

  {
    id: 'rf_pad_claudication',
    displayName: 'Peripheral Arterial Disease / Claudication',
    clinicalConcern: 'Vascular insufficiency in the legs mimicking musculoskeletal pain',
    urgency: 'urgent_48h',
    haltMessage: 'Leg pain that occurs when walking and completely goes away with rest may indicate a circulation problem rather than a muscle or joint issue.',
    haltAction: 'Book an appointment with your GP within 48 hours. Mention the pattern of pain with walking and relief with rest.',
    sourcePrds: ['Heel & Foot'],
    requiresCoordination: false,
    coordinatedModules: [],
    criteria: {
      ALL: [
        { field: 'redFlags.legPainOnWalking', equals: true },
        { field: 'redFlags.completeReliefWithRest', equals: true },
      ],
    },
  },

  {
    id: 'rf_diabetic_foot',
    displayName: 'Diabetic Foot Neuropathy',
    clinicalConcern: 'Diabetic peripheral neuropathy requiring specialist diabetic foot care',
    urgency: 'urgent_48h',
    haltMessage: 'Numbness or tingling in your feet combined with diabetes requires specialist assessment to prevent complications.',
    haltAction: 'Contact your GP or diabetic care team within 48 hours for a diabetic foot review.',
    sourcePrds: ['Heel & Foot'],
    requiresCoordination: false,
    coordinatedModules: [],
    criteria: {
      ALL: [
        { field: 'medicalHistory.diabetes', equals: true },
      ],
      ANY: [
        { field: 'numbness', equals: true },
        { field: 'tingling', equals: true },
      ],
    },
  },

  {
    id: 'rf_ra_window',
    displayName: 'RA Treatment Window',
    clinicalConcern: 'Early rheumatoid arthritis within the critical treatment window',
    urgency: 'urgent_48h',
    haltMessage: 'Your symptoms suggest a pattern consistent with early rheumatoid arthritis. Starting treatment within the first 12 weeks significantly improves long-term outcomes.',
    haltAction: 'See your GP as soon as possible for blood tests and an urgent rheumatology referral. The treatment window is important.',
    sourcePrds: ['RA'],
    requiresCoordination: false,
    coordinatedModules: [],
    criteria: {
      ALL: [
        { field: 'redFlags.raPattern', equals: true },
        { field: 'duration', equals: 'acute_0_6_weeks' },
      ],
    },
  },

  {
    id: 'rf_cancer_flag',
    displayName: 'Cancer Warning Signs',
    clinicalConcern: 'Musculoskeletal pain with systemic cancer warning signs',
    urgency: 'urgent_24h',
    haltMessage: 'Musculoskeletal pain combined with unexplained weight loss or a history of cancer needs prompt medical evaluation to rule out serious causes.',
    haltAction: 'See your GP within 24 hours. Mention your weight loss and/or cancer history alongside your pain symptoms.',
    sourcePrds: ['ALL'],
    requiresCoordination: false,
    coordinatedModules: [],
    criteria: {
      ANY: [
        { field: 'redFlags.unexplainedWeightLoss', equals: true },
      ],
      ALL: [
        { field: 'severity', exists: true },
      ],
    },
  },

  {
    id: 'rf_infection_flag',
    displayName: 'Spinal Infection Warning',
    clinicalConcern: 'Possible spinal infection (discitis, osteomyelitis, epidural abscess)',
    urgency: 'urgent_24h',
    haltMessage: 'Pain combined with fever and night sweats may indicate an infection. This needs prompt medical assessment.',
    haltAction: 'See your GP within 24 hours or attend A&E if you feel unwell. Blood tests will be needed.',
    sourcePrds: ['LBP', 'Neck', 'Disc Bulge', 'Spondylosis'],
    requiresCoordination: false,
    coordinatedModules: [],
    criteria: {
      ALL: [
        { field: 'redFlags.fever', equals: true },
        { field: 'redFlags.nightSweats', equals: true },
      ],
    },
  },

  // ═══════════════════════════════════════════
  // TIER 3 — SPECIALIST (2-4 weeks)
  // ═══════════════════════════════════════════

  {
    id: 'rf_ra_differentiation',
    displayName: 'RA Differentiation',
    clinicalConcern: 'Possible rheumatoid arthritis requiring specialist differentiation from osteoarthritis',
    urgency: 'specialist_2_4_weeks',
    haltMessage: 'Prolonged morning stiffness with symmetrical small joint swelling is a pattern that may suggest rheumatoid arthritis. A specialist can help confirm this.',
    haltAction: 'Book an appointment with your GP for blood tests (RF, anti-CCP, ESR, CRP) and a rheumatology referral.',
    sourcePrds: ['OA', 'RA'],
    requiresCoordination: false,
    coordinatedModules: [],
    criteria: {
      ALL: [
        { field: 'morningStiffnessDuration', greaterThan: 60 },
        { field: 'redFlags.symmetricalSmallJointSwelling', equals: true },
      ],
    },
  },

  {
    id: 'rf_as_differentiation',
    displayName: 'Ankylosing Spondylitis Differentiation',
    clinicalConcern: 'Possible ankylosing spondylitis requiring specialist assessment',
    urgency: 'specialist_2_4_weeks',
    haltMessage: 'Your age, prolonged morning stiffness, and improvement with exercise is a pattern that may suggest ankylosing spondylitis. Early diagnosis helps manage this condition effectively.',
    haltAction: 'See your GP for blood tests (HLA-B27, ESR, CRP) and a rheumatology referral within 2-4 weeks.',
    sourcePrds: ['Spondylosis'],
    requiresCoordination: false,
    coordinatedModules: [],
    criteria: {
      ALL: [
        { field: 'age', lessThan: 35 },
        { field: 'morningStiffnessDuration', greaterThan: 60 },
        { field: 'redFlags.improvesWithExercise', equals: true },
      ],
    },
  },

  {
    id: 'rf_gout',
    displayName: 'Gout',
    clinicalConcern: 'Acute gout attack requiring confirmation and urate-lowering therapy',
    urgency: 'specialist_2_4_weeks',
    haltMessage: 'A sudden, severely painful single joint (especially the big toe or ankle) that is hot and red is characteristic of gout. Confirmation and treatment can prevent future attacks.',
    haltAction: 'See your GP within a few days for blood tests (serum urate) and joint assessment. Anti-inflammatory medication may help in the meantime.',
    sourcePrds: ['OA'],
    requiresCoordination: false,
    coordinatedModules: [],
    criteria: {
      ALL: [
        { field: 'redFlags.suddenSevereSingleJoint', equals: true },
        { field: 'redFlags.jointHotAndRed', equals: true },
      ],
    },
  },
];

/** Get all flags by urgency tier */
export function getRedFlagsByTier(tier: RedFlagDefinition['urgency']): RedFlagDefinition[] {
  return RED_FLAG_REGISTRY.filter((rf) => rf.urgency === tier);
}

/** Get a single flag by ID */
export function getRedFlagById(id: string): RedFlagDefinition | undefined {
  return RED_FLAG_REGISTRY.find((rf) => rf.id === id);
}

/** Urgency priority order (lower = higher priority) */
export const URGENCY_PRIORITY: Record<string, number> = {
  immediate: 0,
  urgent_24h: 1,
  urgent_48h: 2,
  specialist_2_4_weeks: 3,
  none: 99,
};
