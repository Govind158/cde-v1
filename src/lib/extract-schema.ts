/**
 * Kriya CDE — Extraction Schema (CDE v4.1).
 *
 * Mirrors questionnaire.ts option lists EXACTLY.  The extractor snaps the
 * LLM output to one of these literal strings; anything else is dropped or
 * flagged as a qualitative observation (Part I.2 mandate 3).
 */

import type { PatientData } from '@/components/diagnostics/types';

export interface ExtractField {
  key: keyof PatientData | 'height' | 'weight';
  label: string;
  enum?: string[];
  kind: 'enum' | 'enum-multi' | 'number' | 'range-1-10' | 'text';
  hint?: string;
}

// ─── Option lists — mirror questionnaire.ts verbatim ────────────────────
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
  // v4.2 #20: 'Ankle' → 'Knee or Ankle'. Mirrors questionnaire.ts PAIN_REGIONS.
  'Knee or Ankle',
  'Other joints',
  'No pain',
];
const REGIONS_SECONDARY = REGIONS.filter((r) => r !== 'No pain');
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
  // v4.3 C3: 'Pregnancy' → 'Pregnancy / Post Pregnancy'. Mirrors questionnaire.
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
const DURATION = ['Since last 7 days', 'Since last 3 months', 'For more than 3 months'];
const YES_NO = ['Yes', 'No'];
const DIAGNOSES = [
  'Diabetes',
  'Thyroid',
  'Hypertension / blood pressure / stroke',
  'Arthritis',
  'Osteopenia or osteoporosis',
  'Prostate or gynaecological issues',
  'Cardiac or heart conditions',
  "Neurological conditions (Parkinson's / stroke)",
  'Severe asthma',
  // Annex B label fix: spec source said 'spondylolysis' (a different condition).
  // Corrected to 'spondylitis' (the intended inflammatory arthropathy).
  'Ankylosing spondylitis',
  'None of the above',
];
const DEFICIENCIES = [
  'Vitamin D3',
  'Vitamin B12',
  'Calcium',
  'Haemoglobin / iron',
  'Not yet tested / no deficiencies',
];
const PAST_SURGERY = [
  'Spine surgery',
  'Cardiac surgery',
  'Gynaec surgery or hernia',
  'Joint replacements',
  'Other surgeries',
  'No surgeries reported',
];
const SURGERY_RECENCY = ['In the last 1 year', 'Done before the previous year'];
const ORIGINATION = [
  'Sudden injury / accident (fall / sports / lifting)',
  'Gradual onset (no clear cause)',
  'After surgery or medical procedure',
  'Postural strain / overuse (long sitting / repetitive / travel)',
  'Unknown cause',
];
const AGGRAVATOR = [
  'Daily activities (household / dressing / cooking)',
  'Mobility (walking / standing / climbing stairs)',
  'Sitting / desk work (prolonged sitting / computer / driving)',
  'Bending / lifting (picking / twisting / carrying heavy items)',
  'Exercise or sports (running / gym / recreational)',
  "Pain doesn't aggravate",
];
const TIMING_3 = [
  'Immediately (within 10 minutes)',
  'After a few minutes (within 10–30 minutes)',
  'After a while (after 30 minutes)',
];
const RELIEVER = [
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
];
const PAST_TREATMENT = [
  'Pain relief gel / balm / spray / analgesics',
  'Medications under specialist supervision',
  'Physiotherapy / TENS / IFT / traction',
  'Home exercises from online videos',
  'Bed rest only (no medicine / rehab)',
  'Ayurveda treatment',
  'Not undertaken any medication or treatment',
];
const TREATMENT_OUTCOME = [
  'Yes, completely — but pain relapsed',
  'Partial reduction in pain',
  'Yes, but slight pain is still there',
  'No, it did not help at all',
  'No — rather the pain worsened',
];

export const EXTRACT_FIELDS: ExtractField[] = [
  { key: 'L010401', label: 'Gender', kind: 'enum', enum: GENDER },
  { key: 'L010301', label: 'Age (years)', kind: 'number', hint: 'Integer age in years.' },
  { key: 'L010501', label: 'Height (cm)', kind: 'number', hint: 'Convert feet/inches to cm if needed.' },
  { key: 'L010601', label: 'Weight (kg)', kind: 'number', hint: 'Convert lbs to kg if needed.' },
  { key: 'L010701', label: 'Occupation', kind: 'enum', enum: OCCUPATION },
  { key: 'L030101', label: 'Exercise frequency', kind: 'enum', enum: EXERCISE },
  { key: 'L030201', label: 'Primary pain area', kind: 'enum', enum: REGIONS, hint: 'Map colloquial terms: "above buttock"/"lumbar"/"lower spine" → Lower back; "between shoulder blades"/"mid back" → Upper back; "buttock" alone → Hips.' },
  { key: 'L030201b', label: 'Secondary pain area', kind: 'enum', enum: REGIONS_SECONDARY },
  { key: 'L030401', label: 'Pain description', kind: 'enum', enum: PAIN_DESCRIPTION, hint: 'Severity descriptor — "comes and goes" alone is feeling (L030601), not description.' },
  { key: 'L030501', label: 'Pain intensity (1-10)', kind: 'range-1-10' },
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
  { key: 'L170302', label: 'Surgery timing', kind: 'enum', enum: SURGERY_RECENCY },
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

/** Meta-request kinds the extractor must recognise (Part I.2 mandate 1). */
export type MetaRequestKind =
  | 'edit_previous'
  | 'clarify'
  | 'repeat'
  | 'skip'
  | 'end_session';

/** A LLM extraction can be a normal patch OR a meta-request OR a qualitative note. */
export interface ExtractResponse {
  success: boolean;
  /** Fields the LLM was confident enough to fill (high-confidence enum match or numeric). */
  patches: Partial<PatientData> & { height?: string; weight?: string };
  /** Human-facing labels for the summary card. */
  labels: Record<string, string>;
  /** Optional explanatory note. */
  notes?: string;
  /** Spec Part I.2 mandate 1 — meta-request from the user. */
  metaRequest?: { kind: MetaRequestKind; nodeId?: string };
  /** Spec Part I.2 mandate 3 — verbatim qualitative observations. */
  qualitative?: { qcContext?: string; text: string }[];
  /** When two candidates are within the moderate-confidence range, present both. */
  ambiguous?: { qc: string; choices: string[] }[];
  error?: string;
}

export interface ExtractRequest {
  text: string;
  nodeId: string;
  data: PatientData;
}
