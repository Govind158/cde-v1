/**
 * Kriya Pain Diagnostics — Extraction Schema
 *
 * Describes the fields the LLM may fill in a single extraction call.
 * Used both by:
 *   - the server API route to build the prompt + JSON schema for OpenAI
 *   - the client to type-check the response and render the confirmation card
 *
 * IMPORTANT: option lists here MUST match `questionnaire.ts` exactly.
 * The extractor snaps the LLM output to one of these literal strings.
 */

import type { PatientData } from '@/components/diagnostics/types';

export interface ExtractField {
  /** PatientData key (or 'height'/'weight'). */
  key: keyof PatientData | 'height' | 'weight';
  /** Human label the bot uses in its confirmation bubble. */
  label: string;
  /** For enumerated fields, the only valid string values. */
  enum?: string[];
  /** Field kind — controls how the extractor validates and renders the value. */
  kind: 'enum' | 'enum-multi' | 'number' | 'range-1-10' | 'text';
  /** Prompt hint for the LLM. */
  hint?: string;
}

// ─── Option lists — mirror questionnaire.ts exactly ─────────────────
const GENDER = ['Male', 'Female', 'Transgender', 'Prefer not to say'];
const OCCUPATION = [
  'Sitting (desk, driving, office)',
  'Standing (teaching, retail, lab)',
  'Bending / Stooping (farming, plumbing)',
  'Walking (field sales, survey)',
  'Travelling (consulting, management)',
  'Floor sitting / Squatting (homemaker, crafts)',
];
const EXERCISE = ['Daily', 'Approx 3 times a week', 'No exercise or walking at all'];
const REGIONS = [
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
const PAIN_DESCRIPTION = [
  'Mild pain that bothers occasionally',
  'Pain that comes and goes in multiple episodes with brief spells of no pain',
  'Moderate pain that bothers daily but can go about with daily routine',
  'Severe pain that restricts daily routine and requires me to rest',
  'Crippling pain that has made me bed-ridden',
];
const PAIN_FEELING = [
  'Constant – I feel pain all the time, even in rest or during sleep',
  'Intermittent – The pain comes and goes',
];
const PAIN_ACTIVITY = [
  'Pain increases during any movement like bending or lifting',
  'Pain increases in sedentary postures like continuous sitting or driving',
  'Pain increases only while exercising or playing sports',
  "Pain doesn't increase",
];
const SYMPTOMS = [
  'Dizziness or headache',
  'Tingling or numbness or burning sensation',
  'Weakness that leads to difficulty in lifting leg or getting a grip or performing fine motor activities',
  'Difficulty in control of bowel or bladder or having sexual dysfunction',
  'Stiffness in muscles or loss of flexibility',
  'Loss of balance',
  'None',
];
const TREND = ['Worsening', 'Much better than before', 'Same as before'];
const MED_CONDITIONS = [
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
const DURATION = ['Since last 7 days', 'Since last 3 months', 'For more than 3 months'];
const YES_NO = ['Yes', 'No'];
const DIAGNOSES = [
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
];
const DEFICIENCIES = [
  'Vitamin D3',
  'Vitamin B12',
  'Calcium',
  'Hemoglobin / Iron',
  'Not yet tested / No deficiencies',
];
const PAST_SURGERY = [
  'Spine surgery',
  'Cardiac surgery',
  'Gynaec / Hernia',
  'Joint replacements',
  'Other surgeries',
  'No surgeries',
];
const ORIGINATION = [
  'Sudden injury or accident (fall, sports, lifting)',
  'Gradual onset (developed slowly, no clear cause)',
  'After surgery or medical procedure',
  'Postural strain or overuse (long sitting, repetitive activity, travelling)',
  'Unknown cause — not sure how it started',
];
const AGGRAVATOR = [
  'Daily activities (household, dressing, cooking)',
  'During mobility (walking, standing, climbing stairs)',
  'Sitting / Desk work (prolonged sitting, driving)',
  'Bending / Lifting (picking objects, twisting, carrying)',
  'Exercise / Sports (running, gym, recreational)',
  "Pain doesn't aggravate",
];
const TIMING_3 = [
  'Immediately (within 10 minutes)',
  'After a few minutes (10-30 minutes)',
  'After a while (after 30 minutes)',
];
const RELIEVER = [
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
];
const PAST_TREATMENT = [
  'Applied pain relief gel/balm/spray',
  'Taken medications under specialist supervision',
  'Taken physiotherapy/TENS/IFT/traction',
  'Done home exercises from online videos',
  'Simply took bed rest',
  'Underwent ayurveda treatment',
  'Not undertaken any treatment',
];
const TREATMENT_OUTCOME = [
  'Yes completely, but pain relapsed',
  'Partial reduction in pain',
  'Yes but slight pain remains',
  'No, it did not help at all',
  'No, pain increased or worsened further',
];

/**
 * Full field catalogue — every entry the LLM may populate.
 * Strictly matches the options used in the chip list of each node.
 */
export const EXTRACT_FIELDS: ExtractField[] = [
  { key: 'L010401', label: 'Gender', kind: 'enum', enum: GENDER },
  { key: 'L010301', label: 'Age (years)', kind: 'number', hint: 'Integer age in years. Omit if not mentioned.' },
  { key: 'height', label: 'Height (cm)', kind: 'number', hint: 'Convert feet/inches to cm if needed. Omit if not mentioned.' },
  { key: 'weight', label: 'Weight (kg)', kind: 'number', hint: 'Convert lbs to kg if needed. Omit if not mentioned.' },
  { key: 'L010701', label: 'Occupation', kind: 'enum', enum: OCCUPATION },
  { key: 'L030101', label: 'Exercise frequency', kind: 'enum', enum: EXERCISE },
  { key: 'L030201', label: 'Primary pain area', kind: 'enum', enum: REGIONS },
  { key: 'L030201b', label: 'Secondary pain area', kind: 'enum', enum: REGIONS },
  { key: 'L030401', label: 'Pain description', kind: 'enum', enum: PAIN_DESCRIPTION },
  { key: 'L030501', label: 'Pain intensity (1-10)', kind: 'range-1-10', hint: 'Integer 1-10.' },
  { key: 'L030601', label: 'Feeling of pain', kind: 'enum', enum: PAIN_FEELING },
  { key: 'L030701', label: 'Pain with activity', kind: 'enum', enum: PAIN_ACTIVITY },
  { key: 'L030801', label: 'Other symptoms', kind: 'enum-multi', enum: SYMPTOMS },
  { key: 'L030901', label: 'Trend', kind: 'enum', enum: TREND },
  { key: 'L031001', label: 'Medical history', kind: 'enum-multi', enum: MED_CONDITIONS },
  { key: 'L150101', label: 'Duration of pain', kind: 'enum', enum: DURATION },
  { key: 'L150102', label: 'Recent relapse', kind: 'enum', enum: YES_NO },
  { key: 'L170101', label: 'Diagnosed conditions', kind: 'enum-multi', enum: DIAGNOSES },
  { key: 'L170201', label: 'Deficiencies', kind: 'enum-multi', enum: DEFICIENCIES },
  { key: 'L170301', label: 'Past surgeries', kind: 'enum', enum: PAST_SURGERY },
  { key: 'L170302', label: 'Surgery was recent', kind: 'enum', enum: YES_NO },
  { key: 'L190101', label: 'How pain started', kind: 'enum', enum: ORIGINATION },
  { key: 'L190201', label: 'Aggravating activity', kind: 'enum', enum: AGGRAVATOR },
  { key: 'L190202', label: 'Aggravation duration', kind: 'enum', enum: TIMING_3 },
  { key: 'L210101', label: 'What reduces pain', kind: 'enum', enum: RELIEVER },
  { key: 'L210102', label: 'Relief timing', kind: 'enum', enum: TIMING_3 },
  { key: 'L230101', label: 'Past treatment', kind: 'enum', enum: PAST_TREATMENT },
  { key: 'L230102', label: 'Treatment outcome', kind: 'enum', enum: TREATMENT_OUTCOME },
];

export function fieldByKey(key: string): ExtractField | undefined {
  return EXTRACT_FIELDS.find((f) => f.key === key);
}

/** Response shape from /api/extract. */
export interface ExtractResponse {
  success: boolean;
  /** Fields the LLM was confident enough to fill. May be empty. */
  patches: Partial<PatientData> & { height?: string; weight?: string };
  /** Human-facing labels for each extracted field (for the summary card). */
  labels: Record<string, string>;
  /** Optional note explaining what was captured or why something was skipped. */
  notes?: string;
  error?: string;
}

export interface ExtractRequest {
  text: string;
  /** Node the user is currently answering — tells LLM which field to prioritise. */
  nodeId: string;
  /** Current patient data — used to avoid re-extracting already-known fields. */
  data: PatientData;
}
