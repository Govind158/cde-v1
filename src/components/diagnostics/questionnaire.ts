/**
 * Kriya Pain Diagnostics — Questionnaire Flow
 *
 * Defines every question in the chat flow, in the same order as App.jsx (S0 → S13).
 * Each question is a node; the orchestrator walks them, emits bot messages,
 * asks the user for input, echoes the user's reply back as a user bubble,
 * then advances (with optional branching).
 *
 * Branching lives in `next(data)` — pure function on current patient state.
 */

import type { PatientData } from './types';

export type InputKind =
  | 'chips-single'   // single selection from a fixed list
  | 'chips-multi'    // multi selection, with "None" as an exclusive option
  | 'text'
  | 'number'
  | 'range'          // 1..10 slider
  | 'height-weight'  // paired number inputs (height cm / weight kg) — sets both L-keys + derives bmi
  | 'info'           // no input, auto-advance after delay
  | 'processing'     // running the engine
  | 'results';       // terminal

export interface QuestionNode {
  id: string;
  /** QC-coded key stored in patient data. Omit for `info`/`processing`/`results`. */
  field?: keyof PatientData | 'height' | 'weight';
  /** Bot message sequence shown before the input appears. */
  intro: string[];
  /** Follow-on prompt label on the input. */
  prompt?: string;
  /** Input kind. */
  kind: InputKind;
  /** Options for chips. */
  options?: string[];
  /** Dynamic suggestions displayed after the user answers (emitted as additional bot bubbles). */
  postBubbles?: (data: PatientData) => { emoji: string; text: string; color: string }[];
  /** Optional BMI/mini-diagnosis cards. */
  postCards?: (data: PatientData) => { kind: 'bmi' | 'mini-diagnosis' | 'severity' | 'red-flag'; payload: unknown }[];
  /** Returns the next node id or `null` to stay (used by `processing`). */
  next: (data: PatientData) => string | null;
  /** Validation: returns true if the current data satisfies this node. */
  canAdvance?: (data: PatientData) => boolean;
}

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
  'Ankle',
  'Other joints',
  'No pain',
];

export const MED_OPTS = [
  'Pregnancy',
  'Recent surgery',
  'Active fractures',
  'History of cancer',
  'History of tuberculosis',
  'Loss of Appetite or Unexplained Weight Loss',
  'Severe Night Pain',
  'High Grade Fever',
  'Shortness of Breath',
  'History of Neurological Condition',
  'None',
];

export const MED_FOLLOWUPS: Record<string, { q: string; o: string[] }> = {
  Pregnancy: {
    q: 'Current stage of pregnancy?',
    o: ['Currently pregnant', 'Child is younger than 1 year', 'Child is more than 1 year'],
  },
  'Recent surgery': {
    q: 'Surgery timelines?',
    o: ['Surgery was done in last year', 'Surgery was completed before last year'],
  },
  'Active fractures': {
    q: 'Is the active fracture in spine?',
    o: ['Yes', 'No'],
  },
  'History of cancer': {
    q: 'How long have you been suffering?',
    o: ['For less than a year', 'For more than a year', 'Was suffering before but cured now'],
  },
  'History of tuberculosis': {
    q: 'Duration?',
    o: ['Detected last year', 'Detected prior to last year', 'Was suffering before but cured now'],
  },
  'Loss of Appetite or Unexplained Weight Loss': {
    q: 'Weight lost in last 3-6 months?',
    o: ['>8 kgs, not on any diet', '>8 kgs, due to diet/program', 'Weight loss of <7 kgs'],
  },
  'Severe Night Pain': {
    q: 'Does pain force you to get out of bed?',
    o: ['Yes', 'No'],
  },
  'High Grade Fever': {
    q: 'Highest temperature?',
    o: ['<98°F', '98-101°F', '>101°F'],
  },
  'Shortness of Breath': {
    q: 'When do you encounter breathlessness?',
    o: ['While doing rigorous activities', 'Even while at rest'],
  },
  'History of Neurological Condition': {
    q: 'Current status?',
    o: ['Just been a year but still mobile', 'Condition worsening and bed ridden'],
  },
};

/**
 * Canonical flow. IDs are referenced by the orchestrator.
 *
 * S0 Welcome → S1 Demographics → S2 Lifestyle → S3 Region → (No pain? → Results)
 *   → S4 Pain Details → S5 Symptoms & Status → S6 Med History (+ dynamic FU)
 *   → S7 Health & History → S8 Origination
 *   → (aggravates? S9 Aggravation Duration : skip to S10)
 *   → S10 Relief → (reduces? S10b duration : skip) → S11 Past Treatment
 *   → S12 Processing → S13 Results
 */
export const FLOW: QuestionNode[] = [
  {
    id: 'welcome',
    kind: 'info',
    intro: [
      "Hi! I'm Kriya — your Pain Diagnostics assistant.",
      'This journey takes ~12 minutes and ~15 questions to arrive at the final outcome.',
      'Please ensure you are in a quiet, peaceful environment. Your responses act as critical evidence for the diagnostic outcome.',
      "When you're ready, tap Begin below.",
    ],
    next: () => 'gender',
  },

  // ── S1 Demographics ──
  {
    id: 'gender',
    field: 'L010401',
    kind: 'chips-single',
    intro: [
      "Let's start with a short profile.",
    ],
    prompt: 'Gender',
    options: ['Male', 'Female', 'Transgender', 'Prefer not to say'],
    next: () => 'age',
  },
  {
    id: 'age',
    field: 'L010301',
    kind: 'number',
    intro: [
      'We stopped tracking age after the dinosaurs left — but doctors say it\'s mandatory for curating a wellness profile 🦕',
      'How old are you?',
    ],
    prompt: 'Age',
    next: () => 'height-weight',
  },
  {
    id: 'height-weight',
    kind: 'height-weight',
    intro: [
      'Certain pain patterns, muscle responses and recovery pathways vary based on age and gender — this helps curate your wellness profile.',
      'How tall are you, and what do you weigh?',
    ],
    prompt: 'Height (cm) & Weight (kg)',
    next: () => 'occupation',
  },

  // ── S2 Lifestyle ──
  {
    id: 'occupation',
    field: 'L010701',
    kind: 'chips-single',
    intro: [
      'Got it! Now a couple of quick questions about your daily life patterns.',
      'Understanding your daily patterns helps us check for occupational hazards.',
    ],
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
            text: 'No exercise significantly increases MSK risk. Even 15 minutes of daily walking can improve joint health and reduce pain episodes by up to 30%.',
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
    intro: ['Any secondary area of pain? (optional — or pick "skip")'],
    prompt: 'Secondary area of pain',
    // "skip" is appended by the orchestrator dynamically — rendered as the last chip.
    options: [...PAIN_REGIONS.filter((r) => r !== 'No pain'), 'Skip'],
    next: () => 'pain-description',
  },

  // ── S4 Pain Details ──
  {
    id: 'pain-description',
    field: 'L030401',
    kind: 'chips-single',
    intro: ['In other words, if pain had a personality, how would you describe it?'],
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
            text: "That's a great positive indicator! Pain improving suggests your body's natural healing mechanisms are working well.",
          }]
        : [],
    next: () => 'medical-conditions',
  },

  // ── S6 Medical History ──
  {
    id: 'medical-conditions',
    field: 'L031001',
    kind: 'chips-multi',
    intro: [
      "A bit of medical history now. We'd ideally want you to mark none — but just in case.",
    ],
    prompt: 'Detected medical conditions',
    options: MED_OPTS,
    // Follow-up questions for each flagged condition are generated dynamically
    // by the orchestrator (see DiagnosticsChat.tsx), inserted before advancing.
    next: () => 'duration',
  },

  // ── S7 Health & History ──
  {
    id: 'duration',
    field: 'L150101',
    kind: 'chips-single',
    intro: [
      'A preliminary report is almost ready! A few more details will sharpen the diagnostic accuracy.',
      'How long have you had this pain?',
    ],
    prompt: 'Pain duration',
    options: ['Since last 7 days', 'Since last 3 months', 'For more than 3 months'],
    postBubbles: (d) =>
      d.L150101 === 'For more than 3 months'
        ? [{
            emoji: '⏳',
            color: '#f97316',
            text: 'Chronic pain (>3 months) activates degenerative, structural and inflammatory condition scoring pathways — a key differentiator.',
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
      'Hypertension / BP / Stroke',
      'Arthritis',
      'Osteopenia / Osteoporosis',
      'Prostrate / Gynaecological issues',
      'Cardiac / Heart conditions',
      'Neurological (Parkinsons/Stroke)',
      'Severe Asthma',
      'Ankylosing Spondylitis',
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
      'Hemoglobin / Iron',
      'Not yet tested / No deficiencies',
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
      'Gynaec / Hernia',
      'Joint replacements',
      'Other surgeries',
      'No surgeries',
    ],
    next: (d) => (d.L170301 && d.L170301 !== 'No surgeries' ? 'surgery-recent' : 'origination'),
  },
  {
    id: 'surgery-recent',
    field: 'L170302',
    kind: 'chips-single',
    intro: ['Was the surgery recent?'],
    prompt: 'Recent surgery',
    options: ['Yes', 'No'],
    next: () => 'origination',
  },

  // ── S8 Last Lap — Origination ──
  {
    id: 'origination',
    field: 'L190101',
    kind: 'chips-single',
    intro: ['The last lap 🏁 — these pinpoint the root cause.', 'How did the pain first start?'],
    prompt: 'First incidence of pain',
    options: [
      'Sudden injury or accident (fall, sports, lifting)',
      'Gradual onset (developed slowly, no clear cause)',
      'After surgery or medical procedure',
      'Postural strain or overuse (long sitting, repetitive activity, travelling)',
      'Unknown cause — not sure how it started',
    ],
    next: () => 'aggravator',
  },
  {
    id: 'aggravator',
    field: 'L190201',
    kind: 'chips-single',
    intro: ['And what activity increases the pain most?'],
    prompt: 'Aggravating activity',
    options: [
      'Daily activities (household, dressing, cooking)',
      'During mobility (walking, standing, climbing stairs)',
      'Sitting / Desk work (prolonged sitting, driving)',
      'Bending / Lifting (picking objects, twisting, carrying)',
      'Exercise / Sports (running, gym, recreational)',
      "Pain doesn't aggravate",
    ],
    next: (d) => {
      // Only ask aggravation-duration when the user said the pain DOES aggravate.
      // If L190201 is missing OR matches the "doesn't aggravate" option, skip straight to relief.
      const v = d.L190201;
      if (!v || v === "Pain doesn't aggravate" || v.toLowerCase().includes("doesn't")) return 'relief';
      return 'aggravation-duration';
    },
  },

  // ── S9 Aggravation Duration ──
  {
    id: 'aggravation-duration',
    field: 'L190202',
    kind: 'chips-single',
    intro: [
      "To understand your pain better, we'd like to know how long your pain tends to feel worse once it's triggered. This helps us figure out how your muscles and nerves are reacting.",
      'For example, if your pain worsens after walking or sitting, does it settle in a few minutes? Or does it stay for hours?',
      "There's no right or wrong — just tell us what feels closest to your experience.",
    ],
    prompt: 'Duration after which pain aggravates',
    options: [
      'Immediately (within 10 minutes)',
      'After a few minutes (10-30 minutes)',
      'After a while (after 30 minutes)',
    ],
    next: () => 'relief',
  },

  // ── S10 Relief ──
  {
    id: 'relief',
    field: 'L210101',
    kind: 'chips-single',
    intro: ['If there is anything that reduces the pain, that may also help tailor a faster recovery plan.'],
    prompt: 'What activity reduces pain?',
    options: [
      'External factors (balms, hot/ice packs, analgesics)',
      'While sitting on a chair or couch or floor',
      'While standing',
      'While walking',
      'While sleeping or resting',
      'While bending or stooping',
      'While lifting weights',
      'While exercising or working out',
      'While turning in bed or rising from chair',
      "Pain doesn't reduce",
    ],
    next: (d) => (d.L210101 && d.L210101 !== "Pain doesn't reduce" ? 'relief-duration' : 'past-treatment'),
  },
  {
    id: 'relief-duration',
    field: 'L210102',
    kind: 'chips-single',
    intro: [
      "We're mapping your body's recovery rhythm. This will help suggest the right pace of care and find what helps you heal fastest.",
      'How long before the pain starts to reduce?',
    ],
    prompt: 'Relief timing',
    options: [
      'Immediately (within 10 minutes)',
      'After a few minutes (10-30 minutes)',
      'After a while (after 30 minutes)',
    ],
    next: () => 'past-treatment',
  },

  // ── S11 Past Treatment ──
  {
    id: 'past-treatment',
    field: 'L230101',
    kind: 'chips-single',
    intro: ["A last few questions to check if any previous treatment was done."],
    prompt: 'Any past treatment?',
    options: [
      'Applied pain relief gel/balm/spray',
      'Taken medications under specialist supervision',
      'Taken physiotherapy/TENS/IFT/traction',
      'Done home exercises from online videos',
      'Simply took bed rest',
      'Underwent ayurveda treatment',
      'Not undertaken any treatment',
    ],
    next: (d) =>
      d.L230101 && d.L230101 !== 'Not undertaken any treatment' ? 'past-treatment-outcome' : 'processing',
  },
  {
    id: 'past-treatment-outcome',
    field: 'L230102',
    kind: 'chips-single',
    intro: ['Did the treatment help?'],
    prompt: 'Treatment outcome',
    options: [
      'Yes completely, but pain relapsed',
      'Partial reduction in pain',
      'Yes but slight pain remains',
      'No, it did not help at all',
      'No, pain increased or worsened further',
    ],
    next: () => 'processing',
  },

  // ── S12 Processing ──
  {
    id: 'processing',
    kind: 'processing',
    intro: ['Designing your care plan… Running diagnostic engine across all candidate conditions.'],
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
