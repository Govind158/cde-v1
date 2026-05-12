/**
 * Kriya QuickScan — Shoulder Pain Module
 *
 * PRD source: docs/Kriya Scan/QuickScan by Location/kriya_quickscan_shoulder_pain_prd_v1.docx
 * Validation: SPADI, DASH, Constant-Murley conceptual, Oxford Shoulder Score (OSS),
 *             WORC, WOSI, Neer impingement adaptation, NICE shoulder guidelines,
 *             STarT MSK psychosocial.
 *
 * Tier thresholds (PRD §5.2):
 *   LOW       0 – 10
 *   MODERATE  11 – 20
 *   HIGH      21+ OR any hard flag
 *
 * Hard flags (PRD §5.2 *):
 *   (a) Q1.3 Option D — cannot lift arm beyond shoulder height → HIGH
 *   (b) Q1.4 Option B (instability) + Q3.4 Option A (prior dislocation) → HIGH
 *   (c) Q1.1 Option B (capsular) + Q1.3 Option D → HIGH
 *   (d) Q1.4 Option B + POST_INJURY_STREAM (Q1.1 Option C) → HIGH (re-dislocation)
 *
 * Notes:
 *   - Q0.1 is the absolute-priority cardiac screen — modelled as the first
 *     multi-halt question with emergency haltKind. Per PRD §2.3 the cardiac
 *     screen must appear before any other content and ANY positive response
 *     (including 'Not sure') halts immediately. To support 'Not sure' parity
 *     with 'Yes' the user simply ticks each symptom they currently have;
 *     unselected => safe.
 *   - Q1.1 establishes the stream classifier (ACTIVITY / CAPSULAR / POST_INJURY
 *     / DEGENERATIVE / ACUTE_ACTIVITY) consumed by hard flags, condition tags
 *     and Q3.1 / Q3.3 / Q3.4 showWhen predicates.
 *   - CERVICAL_REFERRAL is a condition tag — not a halt — and renders the
 *     'Also assess your Neck' recommendation via routing copy.
 */

import { asArray, asString } from '../engine';
import type { QSModule } from '../types';

// Stream classifier — symmetric with PRD §4.3 Stream Classifier rule.
const Q11_OPTIONS = {
  activity:
    'Came on gradually over weeks — no injury event; often worse with overhead activity or sport',
  capsular:
    'Came on gradually but is now mainly stiffness — I am losing range of movement over time',
  postInjury:
    'Started after a specific shoulder injury (dislocation, fall, or strain) — more than 72 hours ago',
  degenerative:
    'Has been present more than 3 months and is getting progressively worse',
  acuteActivity:
    'Came on recently — within the last 2 weeks, with a possible activity trigger',
} as const;

const Q12_OPTIONS = {
  glenohumeral:
    'On top of or deep within the shoulder joint — aching or catching during arm movement',
  impingement:
    'At the front of the shoulder, spreading into the outer upper arm — sharp on overhead movements',
  posterior:
    'At the back or side of the shoulder — deep, aching, with restricted rotation',
  cervicalReferral:
    'Down the outer arm or into the hand — tingling, numbness, or electric sensation not triggered by shoulder movement',
  capsularGlobal:
    'The entire shoulder region is painful and stiff — hard to isolate a specific spot',
} as const;

const Q13_OPTIONS = {
  none: 'No significant pain through the movement',
  painfulArc:
    'Pain mainly in the middle range — roughly from shoulder height to overhead — but not at the very start or end of the movement',
  throughout: 'Pain throughout the entire movement — from the moment I lift my arm',
  cannotLift:
    'I cannot lift my arm beyond shoulder height — the pain or weakness stops me',
  endRange:
    'Pain mainly at the very end of the movement — when my arm is fully raised overhead',
} as const;

const Q14_OPTIONS = {
  weakness:
    'Weakness — difficulty lifting objects, pushing a door, or raising your arm with strength',
  instability:
    "Instability — shoulder feels like it might 'slip out', 'pop', or give way during certain movements",
  nightPain:
    'Night pain — shoulder pain that wakes you from sleep, particularly when lying on the affected side',
  none: 'None of the above',
} as const;

const Q34_OPTIONS = {
  priorDislocation: 'Shoulder dislocation (partial or full)',
  priorRotatorCuff: 'Rotator cuff tear or tendinopathy',
  priorFrozenShoulder: 'Frozen shoulder or adhesive capsulitis',
  priorImpingement: 'Shoulder impingement syndrome or bursitis',
  priorSurgery: 'Shoulder surgery — arthroscopy, stabilisation, or repair',
  none: 'None of the above / Not sure',
} as const;

function isActivityStream(a: Record<string, unknown>): boolean {
  const v = asString(a['Q1.1']);
  return v === Q11_OPTIONS.activity || v === Q11_OPTIONS.acuteActivity;
}
function isCapsularStream(a: Record<string, unknown>): boolean {
  return asString(a['Q1.1']) === Q11_OPTIONS.capsular;
}
function isPostInjuryStream(a: Record<string, unknown>): boolean {
  return asString(a['Q1.1']) === Q11_OPTIONS.postInjury;
}

const shoulderModule: QSModule = {
  id: 'shoulder',
  kind: 'location',
  displayName: 'Shoulder Pain',
  deepScanRegion: 'Shoulder',
  shortDescription:
    'Rotator cuff, frozen shoulder, impingement & cervical-referred patterns — mapped to SPADI / DASH / OSS / WORC.',
  estimatedMinutes: 3,
  accent: '#a855f7',
  instruments: [
    'Shoulder Pain and Disability Index (SPADI)',
    'Disabilities of the Arm, Shoulder and Hand (DASH)',
    'Oxford Shoulder Score (OSS)',
    'Constant-Murley conceptual framework',
    'Western Ontario Rotator Cuff Index (WORC)',
    'Western Ontario Shoulder Instability Index (WOSI)',
    'Neer impingement conceptual framework',
    'NICE shoulder pain MSK guidelines',
  ],
  disclaimer:
    'Kriya QuickScan is a self-reported wellness risk tool and does not constitute a medical diagnosis. The risk signals generated are based on your responses and are intended to guide general awareness only. Please consult a qualified healthcare professional for clinical assessment, diagnosis, or treatment. If your shoulder or arm pain is accompanied by chest tightness, breathlessness, sweating, or pain spreading to your jaw or other arm, please call 112 or seek emergency medical care immediately.',
  intro: [
    'QuickScan — Shoulder. This is a 2–3 minute risk-signal scan, not a diagnosis.',
    "Before we ask about your shoulder, there is one essential safety screen — then we move into a few short questions about where, when and how it hurts.",
  ],
  questions: [
    // ── LAYER 0 — CARDIAC SCREEN + RED FLAG BATTERY ──────────────
    {
      id: 'Q0.1',
      layer: 0,
      kind: 'multi-halt',
      prompt:
        'Before we begin: is your shoulder or arm pain accompanied by any of the following right now?',
      helper:
        'Tick every one that applies. If none apply, tick "None of the above". Erring on the side of safety — if you are unsure, please tick the symptom.',
      source: 'AHA / ESC acute MI presentation criteria; NICE chest pain guidance adaptation',
      haltLabel: 'None of the above',
      haltKind: 'emergency',
      options: [
        { label: 'Tightness, heaviness, or pain in your chest', points: 0 },
        { label: 'Shortness of breath or difficulty breathing', points: 0 },
        { label: 'Sweating, nausea, or feeling faint', points: 0 },
        { label: 'Pain spreading to your jaw, neck, or other arm', points: 0 },
        { label: 'None of the above', points: 0 },
      ],
    },
    {
      id: 'Q0.2',
      layer: 0,
      kind: 'multi-halt',
      prompt: 'Are you currently experiencing any of the following alongside your shoulder pain?',
      helper: 'Tick every one that applies. If none apply, tick "None of the above".',
      source: 'NICE shoulder red flags; biliary referral pain criteria; septic arthritis recognition',
      haltLabel: 'None of the above',
      haltKind: 'urgent',
      optionHaltKind: {
        'Your shoulder pain started after a fall, collision, or accident and you cannot move your arm':
          'emergency',
        'Your shoulder looks visibly different — out of position, or one shoulder sits lower/higher than the other unexpectedly':
          'emergency',
        'Fever, significant redness, and warmth around the shoulder joint (not related to exercise or injury)':
          'emergency',
      },
      options: [
        {
          label:
            'Right shoulder tip pain (the very tip — not the joint) with stomach pain, nausea, or yellowing of skin',
          points: 0,
        },
        {
          label:
            'Your shoulder pain started after a fall, collision, or accident and you cannot move your arm',
          points: 0,
        },
        {
          label:
            'Your shoulder looks visibly different — out of position, or one shoulder sits lower/higher than the other unexpectedly',
          points: 0,
        },
        {
          label:
            'Fever, significant redness, and warmth around the shoulder joint (not related to exercise or injury)',
          points: 0,
        },
        {
          label:
            'Shoulder pain with unexplained weight loss of more than 5 kg in the past 3 months, or known cancer history',
          points: 0,
        },
        { label: 'None of the above', points: 0 },
      ],
    },

    // ── LAYER 1 — SYMPTOM PROFILE ────────────────────────────────
    {
      id: 'Q1.1',
      layer: 1,
      kind: 'single-scored',
      prompt:
        'How would you best describe how your shoulder pain began and how long it has been present?',
      source: 'SPADI onset items; OSS symptom duration; NICE frozen shoulder clinical recognition criteria',
      options: [
        { label: Q11_OPTIONS.activity, points: 1 },
        { label: Q11_OPTIONS.capsular, points: 2 },
        { label: Q11_OPTIONS.postInjury, points: 2 },
        { label: Q11_OPTIONS.degenerative, points: 3 },
        { label: Q11_OPTIONS.acuteActivity, points: 1 },
      ],
    },
    {
      id: 'Q1.2',
      layer: 1,
      kind: 'multi-scored',
      maxSelect: 2,
      prompt: 'Where is your shoulder pain mainly located and how does it feel? (Select up to 2)',
      source: 'DASH symptom items; SPADI pain sub-scale P1–P5; cervical dermatome self-report adaptation',
      options: [
        { label: Q12_OPTIONS.glenohumeral, points: 1 },
        { label: Q12_OPTIONS.impingement, points: 2 },
        { label: Q12_OPTIONS.posterior, points: 2 },
        { label: Q12_OPTIONS.cervicalReferral, points: 3 },
        { label: Q12_OPTIONS.capsularGlobal, points: 2 },
      ],
    },
    {
      id: 'Q1.2a',
      layer: 1,
      kind: 'single-scored',
      prompt: 'When you feel pain or tingling going down your arm, is it more associated with:',
      source: 'Clinical C5/C6 differentiation; Spurling test self-report adaptation; DASH upper limb function items',
      // Triggered only if Q1.2 contained the cervical-referral option.
      showWhen: (a) => asArray(a['Q1.2']).includes(Q12_OPTIONS.cervicalReferral),
      options: [
        { label: 'Moving or turning your neck — looking over your shoulder, tilting your head', points: 1 },
        { label: 'Lifting your arm away from your body or overhead movements', points: 1 },
        { label: 'Both — neck movement and arm lifting both trigger the symptoms', points: 2 },
      ],
    },
    {
      id: 'Q1.3',
      layer: 1,
      kind: 'single-scored',
      prompt:
        'When you lift your arm out to the side and raise it above your head, when does the pain occur?',
      source: 'Neer impingement conceptual framework; Constant-Murley ROM items; WORC overhead activity items',
      options: [
        { label: Q13_OPTIONS.none, points: 0 },
        { label: Q13_OPTIONS.painfulArc, points: 2 },
        { label: Q13_OPTIONS.throughout, points: 2 },
        { label: Q13_OPTIONS.cannotLift, points: 3 },
        { label: Q13_OPTIONS.endRange, points: 1 },
      ],
    },
    {
      id: 'Q1.4',
      layer: 1,
      kind: 'multi-scored',
      maxSelect: 3,
      prompt: 'Have you experienced any of the following with your shoulder? (Select all that apply)',
      source: 'WORC weakness items; WOSI instability symptoms; SPADI pain P2 (night pain); OSS night pain item',
      options: [
        { label: Q14_OPTIONS.weakness, points: 2 },
        { label: Q14_OPTIONS.instability, points: 3 },
        { label: Q14_OPTIONS.nightPain, points: 2 },
        { label: Q14_OPTIONS.none, points: 0 },
      ],
    },

    // ── LAYER 2 — FUNCTIONAL IMPACT ──────────────────────────────
    {
      id: 'Q2.1',
      layer: 2,
      kind: 'matrix-scored',
      prompt:
        'In the past 2 weeks, how much has your shoulder pain affected your ability to do the following?',
      helper: 'Rate each: Not at all / A little / Quite a bit / Cannot do at all',
      source: 'DASH functional items 1–5; OSS Q3 / Q4 / Q6 / Q7; SPADI disability sub-scale D1–D8',
      subItems: [
        { id: 'A', label: 'Lifting your arm above shoulder height — e.g., placing an object on a high shelf' },
        { id: 'B', label: 'Reaching behind your back — e.g., fastening clothing, tucking in a shirt' },
        { id: 'C', label: 'Carrying a shopping bag or a bag on the affected shoulder' },
        { id: 'D', label: 'Personal hygiene tasks — e.g., washing or combing hair on the affected side' },
      ],
      matrixSubScoreThreshold: { min: 7, bonusPoints: 2 },
    },
    {
      id: 'Q2.2',
      layer: 2,
      kind: 'matrix-scored',
      prompt: 'How has your shoulder pain affected the following areas of your life in the past month?',
      helper: 'Rate each: Not at all / A little / Quite a bit / Cannot do at all',
      source: 'DASH work module items; WORC sport/recreation sub-scale; OSS sleep item Q11',
      subItems: [
        { id: 'A', label: 'Work or daily tasks requiring use of the arm (typing, driving, cooking, writing)' },
        { id: 'B', label: 'Sport, exercise, or recreational activity you normally do' },
        { id: 'C', label: 'Sleep — ability to find a comfortable sleeping position' },
      ],
      matrixSubScoreThreshold: { min: 5, bonusPoints: 1 },
    },

    // ── LAYER 3 — RISK MODIFIERS ─────────────────────────────────
    {
      id: 'Q3.1',
      layer: 3,
      kind: 'single-scored',
      prompt: 'Which of the following best describes your shoulder activity demands?',
      source: 'DASH work module; WORC sports sub-scale SP1–SP4; Nordic MSQ occupational exposure items',
      // PRD: shown to ACTIVITY / IMPINGEMENT stream.
      showWhen: (a) => isActivityStream(a),
      options: [
        { label: 'Minimal overhead use — mostly desk or low-arm-level activity', points: 0 },
        { label: 'Moderate overhead activity — occasional reaching, driving, sport once or twice a week', points: 1 },
        {
          label:
            'Frequent overhead demands — overhead sport (badminton, cricket, swimming, volleyball) 3+ times/week',
          points: 2,
        },
        {
          label:
            'Occupational overhead use — painter, construction, warehouse, or similar sustained overhead work',
          points: 2,
        },
        { label: 'Recently increased training volume or intensity of overhead activity', points: 1 },
      ],
    },
    {
      id: 'Q3.2',
      layer: 3,
      kind: 'single-scored',
      prompt:
        'Thinking about your shoulder pain, which statement feels closest to how you feel?',
      source: 'STarT MSK psychosocial adaptation; WOSI emotional sub-scale EW1–EW4; WORC QOL sub-scale',
      // PRD: shown if Q1.1 = Option D (degenerative/chronic) or total ≥ 9.
      // Engine has no running total at predicate time; gate on Q1.1 = degenerative per PRD primary trigger.
      showWhen: (a) => asString(a['Q1.1']) === Q11_OPTIONS.degenerative,
      options: [
        { label: 'I am confident it will improve with the right care and attention', points: 0 },
        { label: 'I am not sure — it seems to persist despite what I try and I do not know why', points: 1 },
        { label: 'I tend to avoid certain movements or activities because I worry they will make it worse', points: 2 },
        {
          label:
            'My shoulder pain significantly affects my mood, independence, or confidence in daily activities',
          points: 3,
        },
      ],
    },
    {
      id: 'Q3.3',
      layer: 3,
      kind: 'multi-scored',
      prompt: 'Do you have any of the following health conditions?',
      helper: 'Multi-select — this context helps personalise your results.',
      source: 'NICE frozen shoulder risk factor review; Bunker (2009) adhesive capsulitis risk factors; ACR systemic disease associations',
      // PRD: shown if CAPSULAR_STREAM or age > 40. Onboarding age unavailable here;
      // gate on capsular stream per PRD primary trigger.
      showWhen: (a) => isCapsularStream(a),
      options: [
        { label: 'Diabetes or pre-diabetes (Type 1 or Type 2)', points: 1 },
        { label: 'Thyroid condition (overactive or underactive thyroid)', points: 1 },
        { label: 'Autoimmune condition (e.g., rheumatoid arthritis, lupus, or similar)', points: 1 },
        { label: 'None of the above', points: 0 },
      ],
    },
    {
      id: 'Q3.4',
      layer: 3,
      kind: 'multi-scored',
      prompt: 'Have you previously been diagnosed with or treated for any of the following?',
      helper: 'Select all that apply.',
      source: 'Clinical history intake; WOSI prior dislocation items; OSS prior treatment items',
      // PRD: shown if Prior Injury flag = TRUE (= POST_INJURY_STREAM) OR prior shoulder issue
      // flagged in onboarding. Onboarding unavailable here; gate on POST_INJURY_STREAM per PRD trigger.
      showWhen: (a) => isPostInjuryStream(a),
      options: [
        { label: Q34_OPTIONS.priorDislocation, points: 1 },
        { label: Q34_OPTIONS.priorRotatorCuff, points: 1 },
        { label: Q34_OPTIONS.priorFrozenShoulder, points: 1 },
        { label: Q34_OPTIONS.priorImpingement, points: 1 },
        { label: Q34_OPTIONS.priorSurgery, points: 1 },
        { label: Q34_OPTIONS.none, points: 0 },
      ],
    },
  ],

  tiers: { lowMax: 10, moderateMax: 20 },

  hardFlags: [
    {
      id: 'cannot-lift-arm',
      description: 'Q1.3 Option D — cannot lift arm beyond shoulder height',
      matches: (a) => asString(a['Q1.3']) === Q13_OPTIONS.cannotLift,
    },
    {
      id: 'instability-prior-dislocation',
      description: 'Q1.4 instability + Q3.4 prior dislocation — re-dislocation risk',
      matches: (a) =>
        asArray(a['Q1.4']).includes(Q14_OPTIONS.instability) &&
        asArray(a['Q3.4']).includes(Q34_OPTIONS.priorDislocation),
    },
    {
      id: 'frozen-shoulder-cannot-lift',
      description: 'Q1.1 capsular + Q1.3 cannot lift — frozen shoulder with arm restriction',
      matches: (a) =>
        isCapsularStream(a) && asString(a['Q1.3']) === Q13_OPTIONS.cannotLift,
    },
    {
      id: 'post-injury-instability',
      description: 'Q1.4 instability + POST_INJURY_STREAM — re-dislocation risk',
      matches: (a) =>
        asArray(a['Q1.4']).includes(Q14_OPTIONS.instability) && isPostInjuryStream(a),
    },
  ],

  conditionTags: [
    {
      tag: 'Subacromial Impingement',
      matches: (a) =>
        asString(a['Q1.3']) === Q13_OPTIONS.painfulArc && isActivityStream(a),
    },
    {
      tag: 'Rotator Cuff Weakness Signal',
      matches: (a) => {
        const weakness = asArray(a['Q1.4']).includes(Q14_OPTIONS.weakness);
        const arc = asString(a['Q1.3']);
        return weakness && (arc === Q13_OPTIONS.painfulArc || arc === Q13_OPTIONS.cannotLift);
      },
    },
    {
      tag: 'Frozen Shoulder — Early (Freezing)',
      matches: (a) => {
        const arc = asString(a['Q1.3']);
        return (
          isCapsularStream(a) &&
          (arc === Q13_OPTIONS.throughout || arc === Q13_OPTIONS.cannotLift) &&
          asArray(a['Q1.4']).includes(Q14_OPTIONS.nightPain)
        );
      },
    },
    {
      tag: 'Shoulder Instability',
      matches: (a) => asArray(a['Q1.4']).includes(Q14_OPTIONS.instability),
    },
    {
      tag: 'Post-Dislocation Instability',
      matches: (a) =>
        isPostInjuryStream(a) && asArray(a['Q1.4']).includes(Q14_OPTIONS.instability),
    },
    {
      tag: 'Cervical Referral',
      matches: (a) => asArray(a['Q1.2']).includes(Q12_OPTIONS.cervicalReferral),
    },
    {
      tag: 'Painful Arc / Impingement',
      matches: (a) => asString(a['Q1.3']) === Q13_OPTIONS.painfulArc,
    },
    {
      tag: 'Overhead Load Risk',
      matches: (a) => {
        const v = asString(a['Q3.1']);
        return (
          v ===
            'Frequent overhead demands — overhead sport (badminton, cricket, swimming, volleyball) 3+ times/week' ||
          v ===
            'Occupational overhead use — painter, construction, warehouse, or similar sustained overhead work'
        );
      },
    },
    {
      tag: 'Metabolic Risk Factor',
      matches: (a) => {
        const sel = asArray(a['Q3.3']);
        return (
          sel.includes('Diabetes or pre-diabetes (Type 1 or Type 2)') ||
          sel.includes('Thyroid condition (overactive or underactive thyroid)')
        );
      },
    },
    {
      tag: 'Psychosocial Risk',
      matches: (a) => {
        const v = asString(a['Q3.2']);
        return (
          v === 'I tend to avoid certain movements or activities because I worry they will make it worse' ||
          v ===
            'My shoulder pain significantly affects my mood, independence, or confidence in daily activities'
        );
      },
    },
    {
      tag: 'Night Pain — Capsular',
      matches: (a) =>
        isCapsularStream(a) && asArray(a['Q1.4']).includes(Q14_OPTIONS.nightPain),
    },
    {
      tag: 'Prior Surgical History',
      matches: (a) => asArray(a['Q3.4']).includes(Q34_OPTIONS.priorSurgery),
    },
  ],

  routing: {
    low: {
      interpretation:
        'Mild shoulder discomfort — likely early impingement, minor rotator cuff irritation, or postural tension. Minimal functional impact and no movement restriction, night pain or instability in your responses.',
      primaryCTA: { label: 'Explore Muscle Mood + Muscle Age', destination: 'kriya-play', subProgram: 'muscle-mood' },
      secondaryCTA: { label: 'Check your Muscle Age', destination: 'kriya-play', subProgram: 'muscle-age' },
      tip: 'Posture and overhead-load management are the highest-yield habits at this stage — try a daily 60-second wall slide and a desk-posture reset every hour.',
    },
    moderate: {
      interpretation:
        'Persistent or recurrent shoulder pain with measurable impact on overhead activities or daily tasks. May include early frozen shoulder, partial rotator cuff pathology, painful arc, or post-activity impingement — structured intervention is indicated.',
      primaryCTA: { label: 'Start your shoulder mobility programme', destination: 'kriya-play', subProgram: 'muscle-memory' },
      secondaryCTA: { label: 'Ask Myo AI about your shoulder signals', destination: 'myo-ai' },
      tertiaryCTA: { label: 'Get a deeper assessment with DeepScan', destination: 'deepscan' },
      tip: 'Modify, do not stop. Reducing overhead reps by 30–50% for 2–3 weeks plus targeted scapular and rotator cuff work is more effective than full rest for most non-traumatic shoulder pain.',
    },
    high: {
      interpretation:
        'Significant functional limitation from shoulder pain. Patterns include frozen shoulder, significant rotator cuff weakness, instability with prior dislocation, or chronic degenerative shoulder — professional clinical evaluation is warranted and imaging may be appropriate.',
      primaryCTA: { label: 'Begin Kriya Care — Shoulder Programme', destination: 'kriya-care', subProgram: 'walk-more' },
      secondaryCTA: { label: 'Ask Myo AI for clarity now', destination: 'myo-ai' },
      tertiaryCTA: { label: 'Strongly recommended — DeepScan', destination: 'deepscan' },
      mandatoryDeepScanPrompt: true,
      tip: 'Significant arm weakness, mechanical instability, and frozen-shoulder restrictions are best assessed in person. Please book an orthopaedic or physiotherapy review — discuss imaging (ultrasound or MRI) with your clinician if weakness is a feature.',
    },
  },
};

export default shoulderModule;
