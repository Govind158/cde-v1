/**
 * Kriya CDE — Questionnaire flow (CDE v4.1, Part II).
 *
 * The flow is the SINGLE source of truth for question order and branching.
 * The orchestrator walks nodes; option labels here MUST match the canonical
 * row labels in `option-keys.ts`.  Adding/renaming a chip requires updating
 * `option-keys.ts` first, otherwise the answer maps to no row letter and
 * scoring silently sees a zero — a clinical bug.
 *
 * v4.1 changes vs pre-v4.1:
 *   - height-weight paired input split into separate `height` and `weight`
 *     numeric nodes (per spec: open-ended numeric → LLM cohorts to band).
 *     The pair will not break existing PatientData since legacy keys are
 *     kept @deprecated; v4.1 reads L010501_band / L010601_band.
 *   - L031001 follow-ups now stored under canonical L031002–L031011 keys
 *     (was: legacy `FU_<condition>` strings).
 *   - L031001 'High Grade Fever' renamed → 'High grade fever' to match spec.
 *   - L170101 'Ankylosing Spondylitis' renamed → 'Ankylosing spondylitis'
 *     (Annex B label fix).
 *   - All branching rules per Annex A are preserved; surgery-recent now uses
 *     'In the last 1 year' / 'Done before the previous year' (was Yes/No).
 */

import type { PatientData, RowLetter } from './types';

export type InputKind =
  | 'chips-single'
  | 'chips-multi'
  | 'text'
  | 'number'
  | 'range'
  | 'height-weight'   // pre-v4.1 paired input (kept for back-compat)
  | 'info'
  | 'processing'
  | 'results';

export interface QuestionNode {
  id: string;
  field?: keyof PatientData | 'height' | 'weight';
  intro: string[];
  prompt?: string;
  kind: InputKind;
  options?: string[];
  postBubbles?: (data: PatientData) => { emoji: string; text: string; color: string }[];
  postCards?: (data: PatientData) => { kind: 'bmi' | 'mini-diagnosis' | 'severity' | 'red-flag'; payload: unknown }[];
  next: (data: PatientData) => string | null;
  canAdvance?: (data: PatientData) => boolean;
}

// ─── Canonical option lists (match option-keys.ts verbatim) ─────────────

export const PAIN_REGIONS = [
  'Neck',
  'Shoulder',
  'Arm above elbow',
  'Arm below elbow',
  'Upper back',
  'Lower back',
  'Hips',
  'Thigh above knee',
  'Leg below knee',
  // v4.2 #20: 'Ankle' renamed to 'Knee or Ankle' so Knee-region triggers
  // (H/I/J) are anatomically coherent.
  'Knee or Ankle',
  'Other joints',
  'No pain',
];

export const MED_OPTS = [
  // v4.3 C3: 'Pregnancy' → 'Pregnancy / Post Pregnancy' so users in
  // either state self-select to row A. Label change only — no scoring
  // weights affected by this rename.
  'Pregnancy / Post Pregnancy',
  'Recent surgery',
  'Active fractures',
  'History of cancer',
  'History of tuberculosis',
  'Loss of appetite / unexplained weight loss',
  'Severe night pain',
  'High grade fever',
  'Shortness of breath',
  'History of neurological condition',
  'None',
];

/**
 * Co-morbidity → (canonical follow-up QC code, question + options).
 * Spec Annex A maps L031001 row A→L031002 ... J→L031011, K→no follow-up.
 * Option labels are verbatim from spec Part II "Option-to-code key".
 */
export const MED_FOLLOWUPS: Record<
  string,
  { qcCode: keyof PatientData; q: string; o: string[] }
> = {
  // Key matches the L031001 row-A canonical label (post-v4.3 rename).
  'Pregnancy / Post Pregnancy': {
    qcCode: 'L031002',
    q: 'Current stage of pregnancy?',
    o: ['Currently pregnant', 'Child is younger than 1 year', 'Child is more than 1 year'],
  },
  'Recent surgery': {
    qcCode: 'L031003',
    q: 'Surgery timeline?',
    o: ['Surgery done in last year', 'Surgery completed before last year'],
  },
  'Active fractures': {
    qcCode: 'L031004',
    q: 'Is the active fracture in the spine?',
    o: ['Yes — fracture is in spine', 'No'],
  },
  'History of cancer': {
    qcCode: 'L031005',
    q: 'How long have you had this condition?',
    o: ['For less than a year', 'For more than a year', 'Was suffering before but cured now'],
  },
  'History of tuberculosis': {
    qcCode: 'L031006',
    q: 'When was it detected?',
    o: ['Detected last year', 'Detected prior to last year', 'Was suffering before but cured now'],
  },
  'Loss of appetite / unexplained weight loss': {
    qcCode: 'L031007',
    q: 'How much weight have you lost in the last 3-6 months?',
    o: ['>8 kg (no diet / weight loss regime)', '>8 kg (on specific diet / weight loss program)', 'Weight loss <7 kg'],
  },
  'Severe night pain': {
    qcCode: 'L031008',
    q: 'Does the pain force you to get out of bed?',
    o: ['Yes', 'No'],
  },
  'High grade fever': {
    qcCode: 'L031009',
    q: 'What was your highest body temperature?',
    o: ['<98° F', '98–101° F', '>101° F'],
  },
  'Shortness of breath': {
    qcCode: 'L031010',
    q: 'When does the breathlessness occur?',
    o: ['While doing rigorous activities', 'Even while at rest'],
  },
  'History of neurological condition': {
    qcCode: 'L031011',
    q: 'What is the current status?',
    o: ['Under 1 year; still mobile and able to move', 'Worsening; bed-ridden'],
  },
};

/** Helper: cohort raw age into the L010301 band letter A–F. */
export function ageBandFromYears(years: number): RowLetter {
  if (years <= 30) return 'A';
  if (years <= 40) return 'B';
  if (years <= 50) return 'C';
  if (years <= 60) return 'D';
  if (years <= 70) return 'E';
  return 'F';
}

export const FLOW: QuestionNode[] = [
  {
    id: 'welcome',
    kind: 'info',
    intro: [
      "Hi! I'm Kriya — your Pain Risk Assessment assistant.",
      'This is a structured risk-discovery tool, not a diagnostic tool. It will give you an indication of likely musculoskeletal patterns and what category of clinical attention may be warranted.',
      'It takes about 12 minutes (15-25 questions). Your answers are critical, so please ensure you are in a quiet, peaceful environment.',
      'When ready, tap Begin below.',
    ],
    next: () => 'gender',
  },

  // ── S1 Demographics ──
  {
    id: 'gender',
    field: 'L010401',
    kind: 'chips-single',
    intro: ["Let's start with a short profile."],
    prompt: 'Gender',
    options: ['Male', 'Female', 'Transgender', 'Prefer not to say'],
    next: () => 'age',
  },
  {
    id: 'age',
    field: 'L010301',
    kind: 'number',
    intro: [
      'Age helps us cohort your assessment against MSK risk patterns observed in similar age bands.',
      'How old are you (years)?',
    ],
    prompt: 'Age',
    next: () => 'height',
  },
  {
    id: 'height',
    field: 'L010501',
    kind: 'number',
    intro: ['How tall are you (in cm)?'],
    prompt: 'Height (cm)',
    next: () => 'weight',
  },
  {
    id: 'weight',
    field: 'L010601',
    kind: 'number',
    intro: ['And what do you weigh (in kg)?'],
    prompt: 'Weight (kg)',
    next: () => 'occupation',
  },

  // ── S2 Lifestyle ──
  {
    id: 'occupation',
    field: 'L010701',
    kind: 'chips-single',
    intro: ['Got it. Now a couple of quick questions about your daily life patterns.'],
    prompt: 'Occupation / Primary Activity',
    options: [
      'Sitting (desk, driving, office)',
      'Standing (teaching, retail, lab)',
      'Bending / Stooping (farming, plumbing)',
      'Walking (field sales, survey)',
      'Travelling (consulting, management)',
      'Floor sitting / Squatting (homemaker, crafts)',
    ],
    postBubbles: (d) =>
      d.L010701?.includes('Sitting')
        ? [{
            emoji: '🪑',
            color: '#a855f7',
            text: 'Sedentary lifestyles are the #1 contributor to postural back and neck pain in ages 25-40. Regular micro-breaks and stretching make a significant difference.',
          }]
        : [],
    next: () => 'exercise',
  },
  {
    id: 'exercise',
    field: 'L030101',
    kind: 'chips-single',
    intro: ['And how often do you exercise?'],
    prompt: 'Exercise Frequency',
    options: ['Daily', 'Approx 3 times a week', 'No exercise or walking at all'],
    postBubbles: (d) =>
      d.L030101 === 'No exercise or walking at all'
        ? [{
            emoji: '⚠️',
            color: '#f59e0b',
            text: 'No regular movement significantly increases MSK risk. Even 15 minutes of daily walking can improve joint health and reduce pain episodes by up to 30%.',
          }]
        : [],
    next: () => 'region',
  },

  // ── S3 Region ──
  {
    id: 'region',
    field: 'L030201',
    kind: 'chips-single',
    intro: ["Now let's pinpoint the pain. Select your primary area of discomfort."],
    prompt: 'Area of Pain',
    options: PAIN_REGIONS,
    next: (d) => (d.L030201 === 'No pain' ? 'processing' : 'region-secondary'),
  },
  {
    id: 'region-secondary',
    field: 'L030201b',
    kind: 'chips-single',
    intro: ['Any secondary area of pain? (optional — pick "Skip" if none)'],
    prompt: 'Secondary area of pain',
    options: [...PAIN_REGIONS.filter((r) => r !== 'No pain'), 'Skip'],
    next: () => 'pain-description',
  },

  // ── S4 Pain Details ──
  {
    id: 'pain-description',
    field: 'L030401',
    kind: 'chips-single',
    intro: ['If pain had a personality, how would you describe it?'],
    prompt: 'Describe your pain',
    options: [
      'Mild pain that bothers occasionally',
      'Pain that comes and goes in multiple episodes with brief spells of no pain',
      'Moderate pain that bothers daily but can go about with daily routine',
      'Severe pain that restricts daily routine and requires me to rest',
      'Crippling pain that has made me bed-ridden',
    ],
    next: () => 'pain-scale',
  },
  {
    id: 'pain-scale',
    field: 'L030501',
    kind: 'range',
    intro: ['On a scale of 1-10, how intense is the pain right now?'],
    prompt: 'Pain Scale',
    next: () => 'pain-feeling',
  },
  {
    id: 'pain-feeling',
    field: 'L030601',
    kind: 'chips-single',
    intro: ['Is the pain there all the time, or does it come and go?'],
    prompt: 'Feeling of pain',
    options: [
      'Constant – I feel pain all the time, even in rest or during sleep',
      'Intermittent – The pain comes and goes',
    ],
    next: () => 'pain-activity',
  },
  {
    id: 'pain-activity',
    field: 'L030701',
    kind: 'chips-single',
    intro: ['Does the pain change when you move or stay still?'],
    prompt: 'Does pain change with activity?',
    options: [
      'Pain increases during any movement like bending or lifting',
      'Pain increases in sedentary postures like continuous sitting or driving',
      'Pain increases only while exercising or playing sports',
      "Pain doesn't increase",
    ],
    next: () => 'symptoms',
  },

  // ── S5 Symptoms & Status ──
  {
    id: 'symptoms',
    field: 'L030801',
    kind: 'chips-multi',
    intro: ["Let's quickly check for any other symptoms alongside the pain. Mark all that apply."],
    prompt: 'Alongside pain, have you encountered any of these?',
    options: [
      'Dizziness or headache',
      'Tingling or numbness or burning sensation',
      'Weakness that leads to difficulty in lifting leg or getting a grip or performing fine motor activities',
      'Difficulty in control of bowel or bladder or having sexual dysfunction',
      'Stiffness in muscles or loss of flexibility',
      'Loss of balance',
      'None',
    ],
    next: () => 'trend',
  },
  {
    id: 'trend',
    field: 'L030901',
    kind: 'chips-single',
    intro: ['How is the pain since it started?'],
    prompt: 'Trend',
    options: ['Worsening', 'Much better than before', 'Same as before'],
    postBubbles: (d) =>
      d.L030901 === 'Much better than before'
        ? [{
            emoji: '🎉',
            color: '#22c55e',
            text: "That's a positive indicator. Improving pain often means your body's natural healing is on track.",
          }]
        : [],
    next: () => 'medical-conditions',
  },

  // ── S6 Medical History ──
  {
    id: 'medical-conditions',
    field: 'L031001',
    kind: 'chips-multi',
    intro: ['A bit of medical history. Mark all that apply (or None).'],
    prompt: 'Detected medical conditions',
    options: MED_OPTS,
    next: () => 'duration',
  },

  // ── S7 Health & History ──
  {
    id: 'duration',
    field: 'L150101',
    kind: 'chips-single',
    intro: [
      'A few more details to sharpen the assessment.',
      'How long have you had this pain?',
    ],
    prompt: 'Pain duration',
    options: ['Since last 7 days', 'Since last 3 months', 'For more than 3 months'],
    postBubbles: (d) =>
      d.L150101 === 'For more than 3 months'
        ? [{
            emoji: '⏳',
            color: '#f97316',
            text: 'Chronic pain (>3 months) activates degenerative, structural and inflammatory pattern scoring — a key differentiator.',
          }]
        : [],
    next: () => 'relapse',
  },
  {
    id: 'relapse',
    field: 'L150102',
    kind: 'chips-single',
    intro: ['Have you had a pain relapse in the last 2 weeks?'],
    prompt: 'Pain relapse',
    options: ['Yes', 'No'],
    next: () => 'diagnoses',
  },
  {
    id: 'diagnoses',
    field: 'L170101',
    kind: 'chips-multi',
    intro: ['Any conditions diagnosed in the last year?'],
    prompt: 'Diagnosed conditions',
    options: [
      'Diabetes',
      'Thyroid',
      'Hypertension / blood pressure / stroke',
      'Arthritis',
      'Osteopenia or osteoporosis',
      'Prostate or gynaecological issues',
      'Cardiac or heart conditions',
      "Neurological conditions (Parkinson's / stroke)",
      'Severe asthma',
      'Ankylosing spondylitis',
      'None of the above',
    ],
    next: () => 'deficiencies',
  },
  {
    id: 'deficiencies',
    field: 'L170201',
    kind: 'chips-multi',
    intro: ['Any known deficiencies?'],
    prompt: 'Deficiencies',
    options: [
      'Vitamin D3',
      'Vitamin B12',
      'Calcium',
      'Haemoglobin / iron',
      'Not yet tested / no deficiencies',
    ],
    next: () => 'surgery',
  },
  {
    id: 'surgery',
    field: 'L170301',
    kind: 'chips-single',
    intro: ['Any past surgeries?'],
    prompt: 'Past surgeries',
    options: [
      'Spine surgery',
      'Cardiac surgery',
      'Gynaec surgery or hernia',
      'Joint replacements',
      'Other surgeries',
      'No surgeries reported',
    ],
    next: (d) => (d.L170301 && d.L170301 !== 'No surgeries reported' ? 'surgery-recent' : 'origination'),
  },
  {
    id: 'surgery-recent',
    field: 'L170302',
    kind: 'chips-single',
    intro: ['When was the surgery?'],
    prompt: 'Surgery timing',
    options: ['In the last 1 year', 'Done before the previous year'],
    next: () => 'origination',
  },

  // ── S8 Origination ──
  {
    id: 'origination',
    field: 'L190101',
    kind: 'chips-single',
    intro: ['The last lap. These pinpoint the root cause.', 'How did the pain first start?'],
    prompt: 'First incidence of pain',
    options: [
      'Sudden injury / accident (fall / sports / lifting)',
      'Gradual onset (no clear cause)',
      'After surgery or medical procedure',
      'Postural strain / overuse (long sitting / repetitive / travel)',
      'Unknown cause',
    ],
    next: () => 'aggravator',
  },
  {
    id: 'aggravator',
    field: 'L190201',
    kind: 'chips-single',
    intro: ['What activity increases the pain most?'],
    prompt: 'Aggravating activity',
    options: [
      'Daily activities (household / dressing / cooking)',
      'Mobility (walking / standing / climbing stairs)',
      'Sitting / desk work (prolonged sitting / computer / driving)',
      'Bending / lifting (picking / twisting / carrying heavy items)',
      'Exercise or sports (running / gym / recreational)',
      "Pain doesn't aggravate",
    ],
    next: (d) => {
      const v = d.L190201;
      if (!v || v === "Pain doesn't aggravate") return 'relief';
      return 'aggravation-duration';
    },
  },
  {
    id: 'aggravation-duration',
    field: 'L190202',
    kind: 'chips-single',
    intro: [
      'Once the pain is triggered, how long does it tend to feel worse?',
      'For example, if it worsens after walking or sitting — does it settle in a few minutes, or does it stay for hours?',
    ],
    prompt: 'Duration after which pain aggravates',
    options: [
      'Immediately (within 10 minutes)',
      'After a few minutes (within 10–30 minutes)',
      'After a while (after 30 minutes)',
    ],
    next: () => 'relief',
  },

  // ── S10 Relief ──
  {
    id: 'relief',
    field: 'L210101',
    kind: 'chips-single',
    intro: ['If anything reduces the pain, that helps tailor a recovery plan.'],
    prompt: 'What activity reduces pain?',
    options: [
      'External factors (balms / hot / ice / analgesics)',
      'Sitting (on chair / couch / floor)',
      'Standing',
      'Walking',
      'Sleeping / resting',
      'Bending / stooping',
      'Lifting weights',
      'Exercises / working out',
      'Turning in bed / rising from chair',
      "Pain doesn't reduce",
    ],
    next: (d) => (d.L210101 && d.L210101 !== "Pain doesn't reduce" ? 'relief-duration' : 'past-treatment'),
  },
  {
    id: 'relief-duration',
    field: 'L210102',
    kind: 'chips-single',
    intro: ['How long before the pain starts to reduce?'],
    prompt: 'Relief timing',
    options: [
      'Immediately (within 10 minutes)',
      'After a few minutes (within 10–30 minutes)',
      'After a while (after 30 minutes)',
    ],
    next: () => 'past-treatment',
  },

  // ── S11 Past Treatment ──
  {
    id: 'past-treatment',
    field: 'L230101',
    kind: 'chips-single',
    intro: ['A few last questions about previous treatment.'],
    prompt: 'Any past treatment?',
    options: [
      'Pain relief gel / balm / spray / analgesics',
      'Medications under specialist supervision',
      'Physiotherapy / TENS / IFT / traction',
      'Home exercises from online videos',
      'Bed rest only (no medicine / rehab)',
      'Ayurveda treatment',
      'Not undertaken any medication or treatment',
    ],
    next: (d) =>
      d.L230101 && d.L230101 !== 'Not undertaken any medication or treatment' ? 'past-treatment-outcome' : 'processing',
  },
  {
    id: 'past-treatment-outcome',
    field: 'L230102',
    kind: 'chips-single',
    intro: ['Did the treatment help?'],
    prompt: 'Treatment outcome',
    options: [
      'Yes, completely — but pain relapsed',
      'Partial reduction in pain',
      'Yes, but slight pain is still there',
      'No, it did not help at all',
      'No — rather the pain worsened',
    ],
    next: () => 'processing',
  },

  // ── S12 Processing ──
  {
    id: 'processing',
    kind: 'processing',
    intro: ['Running the deterministic risk engine across all candidate conditions in your region pool…'],
    next: () => 'results',
  },

  // ── S13 Results ──
  {
    id: 'results',
    kind: 'results',
    intro: [],
    next: () => null,
  },
];

export function getNode(id: string): QuestionNode | undefined {
  return FLOW.find((n) => n.id === id);
}
