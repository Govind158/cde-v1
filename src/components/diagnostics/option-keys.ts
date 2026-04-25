/**
 * Kriya CDE — Option-to-row-letter map (Part II spec "Option-to-code key").
 *
 * Scoring matrices are addressed by (QC, row letter).  Chips show option
 * text to the user.  This module is the ONLY bridge between them.  Every
 * chip text listed in questionnaire.ts must resolve via this map to a valid
 * row letter.  If a chip text is not present here, scoring cannot find it
 * and it contributes zero — which is a latent clinical bug.
 *
 * Strings here are the CANONICAL chip labels used by questionnaire.ts and
 * extract-schema.ts.  When adding a chip to either, add the letter here
 * first.  Forward matching is exact; if a chip text diverges, normalise it.
 */

import type { QcCode, RowLetter } from './types';

// ─── Canonical chip labels (match questionnaire.ts verbatim) ────────────
// The keys below are the labels the user sees and that PatientData stores.
// Spec option text (spec Part II) is included in comments for audit.

const MAP: Partial<Record<QcCode, Record<string, RowLetter>>> = {
  L010401: {
    Male: 'A',
    Female: 'B',
    Transgender: 'C',
    'Prefer not to say': 'D',
  },

  // Age/Height/Weight raw answers are numerics; scoring reads the _band keys
  // which store the letter directly.  No label map needed for these three.

  L010701: {
    'Sitting (desk, driving, office)': 'A',
    'Standing (teaching, retail, lab)': 'B',
    'Bending / Stooping (farming, plumbing)': 'C',
    'Walking (field sales, survey)': 'D',
    'Travelling (consulting, management)': 'E',
    'Floor sitting / Squatting (homemaker, crafts)': 'F',
    Others: 'G',
  },
  L030101: {
    Daily: 'A',
    'Approx 3 times a week': 'B',
    'No exercise or walking at all': 'C',
  },
  L030201: {
    Neck: 'A',
    Shoulder: 'B',
    'Arm above elbow': 'C',
    'Arm below elbow': 'D',
    'Upper back': 'E',
    'Lower back': 'F',
    Hips: 'G',
    'Thigh above knee': 'H',
    'Leg below knee': 'I',
    Ankle: 'J',
    'Other joints': 'K',
    'No pain': 'L',
  },
  L030201b: {
    // Same anatomy as L030201 minus 'No pain'.
    Neck: 'A',
    Shoulder: 'B',
    'Arm above elbow': 'C',
    'Arm below elbow': 'D',
    'Upper back': 'E',
    'Lower back': 'F',
    Hips: 'G',
    'Thigh above knee': 'H',
    'Leg below knee': 'I',
    Ankle: 'J',
    'Other joints': 'K',
  },
  L030401: {
    'Mild pain that bothers occasionally': 'A',
    'Pain that comes and goes in multiple episodes with brief spells of no pain': 'B',
    'Moderate pain that bothers daily but can go about with daily routine': 'C',
    'Severe pain that restricts daily routine and requires me to rest': 'D',
    'Crippling pain that has made me bed-ridden': 'E',
  },
  // L030501 is a 1–10 slider; scoring resolves bucket A–J via helper below.
  L030601: {
    'Constant – I feel pain all the time, even in rest or during sleep': 'A',
    'Intermittent – The pain comes and goes': 'B',
  },
  L030701: {
    'Pain increases during any movement like bending or lifting': 'A',
    'Pain increases in sedentary postures like continuous sitting or driving': 'B',
    'Pain increases only while exercising or playing sports': 'C',
    "Pain doesn't increase": 'D',
  },
  L030801: {
    'Dizziness or headache': 'A',
    'Tingling or numbness or burning sensation': 'B',
    'Weakness that leads to difficulty in lifting leg or getting a grip or performing fine motor activities': 'C',
    'Difficulty in control of bowel or bladder or having sexual dysfunction': 'D',
    'Stiffness in muscles or loss of flexibility': 'E',
    'Loss of balance': 'F',
    None: 'G',
  },
  L030901: {
    Worsening: 'A',
    'Much better than before': 'B',
    'Same as before': 'C',
  },
  L031001: {
    Pregnancy: 'A',
    'Recent surgery': 'B',
    'Active fractures': 'C',
    'History of cancer': 'D',
    'History of tuberculosis': 'E',
    'Loss of appetite / unexplained weight loss': 'F',
    'Severe night pain': 'G',
    'High grade fever': 'H',
    'Shortness of breath': 'I',
    'History of neurological condition': 'J',
    None: 'K',
  },
  L031002: {
    'Currently pregnant': 'A',
    'Child is younger than 1 year': 'B',
    'Child is more than 1 year': 'C',
  },
  L031003: {
    'Surgery done in last year': 'A',
    'Surgery completed before last year': 'B',
  },
  L031004: {
    'Yes — fracture is in spine': 'A',
    No: 'B',
  },
  L031005: {
    'For less than a year': 'A',
    'For more than a year': 'B',
    'Was suffering before but cured now': 'C',
  },
  L031006: {
    'Detected last year': 'A',
    'Detected prior to last year': 'B',
    'Was suffering before but cured now': 'C',
  },
  L031007: {
    '>8 kg (no diet / weight loss regime)': 'A',
    '>8 kg (on specific diet / weight loss program)': 'B',
    'Weight loss <7 kg': 'C',
  },
  L031008: {
    Yes: 'A',
    No: 'B',
  },
  L031009: {
    '<98° F': 'A',
    '98–101° F': 'B',
    '>101° F': 'C',
  },
  L031010: {
    'While doing rigorous activities': 'A',
    'Even while at rest': 'B',
  },
  L031011: {
    'Under 1 year; still mobile and able to move': 'A',
    'Worsening; bed-ridden': 'B',
  },
  L150101: {
    'Since last 7 days': 'A',
    'Since last 3 months': 'B',
    'For more than 3 months': 'C',
  },
  L150102: {
    Yes: 'A',
    No: 'B',
  },
  L170101: {
    Diabetes: 'A',
    Thyroid: 'B',
    'Hypertension / blood pressure / stroke': 'C',
    Arthritis: 'D',
    'Osteopenia or osteoporosis': 'E',
    'Prostate or gynaecological issues': 'F',
    'Cardiac or heart conditions': 'G',
    "Neurological conditions (Parkinson's / stroke)": 'H',
    'Severe asthma': 'I',
    // Annex B correction: spec label "Ankylosing spondylolysis" is clinically
    // incorrect (spondylolysis = pars defect, a different condition).  Corrected
    // user-facing text to "Ankylosing spondylitis" — still row J so weights align.
    'Ankylosing spondylitis': 'J',
    'None of the above': 'K',
  },
  L170201: {
    'Vitamin D3': 'A',
    'Vitamin B12': 'B',
    Calcium: 'C',
    'Haemoglobin / iron': 'D',
    'Not yet tested / no deficiencies': 'E',
  },
  L170301: {
    'Spine surgery': 'A',
    'Cardiac surgery': 'B',
    'Gynaec surgery or hernia': 'C',
    'Joint replacements': 'D',
    'Other surgeries': 'E',
    'No surgeries reported': 'F',
  },
  L170302: {
    'In the last 1 year': 'A',
    'Done before the previous year': 'B',
  },
  L190101: {
    'Sudden injury / accident (fall / sports / lifting)': 'A',
    'Gradual onset (no clear cause)': 'B',
    'After surgery or medical procedure': 'C',
    'Postural strain / overuse (long sitting / repetitive / travel)': 'D',
    'Unknown cause': 'E',
  },
  L190201: {
    'Daily activities (household / dressing / cooking)': 'A',
    'Mobility (walking / standing / climbing stairs)': 'B',
    'Sitting / desk work (prolonged sitting / computer / driving)': 'C',
    'Bending / lifting (picking / twisting / carrying heavy items)': 'D',
    'Exercise or sports (running / gym / recreational)': 'E',
    "Pain doesn't aggravate": 'F',
  },
  L190202: {
    'Immediately (within 10 minutes)': 'A',
    'After a few minutes (within 10–30 minutes)': 'B',
    'After a while (after 30 minutes)': 'C',
  },
  L210101: {
    'External factors (balms / hot / ice / analgesics)': 'A',
    'Sitting (on chair / couch / floor)': 'B',
    Standing: 'C',
    Walking: 'D',
    'Sleeping / resting': 'E',
    'Bending / stooping': 'F',
    'Lifting weights': 'G',
    'Exercises / working out': 'H',
    'Turning in bed / rising from chair': 'I',
    "Pain doesn't reduce": 'J',
  },
  L210102: {
    'Immediately (within 10 minutes)': 'A',
    'After a few minutes (within 10–30 minutes)': 'B',
    'After a while (after 30 minutes)': 'C',
  },
  L230101: {
    'Pain relief gel / balm / spray / analgesics': 'A',
    'Medications under specialist supervision': 'B',
    'Physiotherapy / TENS / IFT / traction': 'C',
    'Home exercises from online videos': 'D',
    'Bed rest only (no medicine / rehab)': 'E',
    'Ayurveda treatment': 'F',
    'Not undertaken any medication or treatment': 'G',
  },
  L230102: {
    'Yes, completely — but pain relapsed': 'A',
    'Partial reduction in pain': 'B',
    'Yes, but slight pain is still there': 'C',
    'No, it did not help at all': 'D',
    'No — rather the pain worsened': 'E',
  },
};

export const OPTION_KEYS = MAP as Record<QcCode, Record<string, RowLetter>>;

/**
 * Convert a chip text label to its row letter for a given QC.
 * Returns null if the label is unknown — scoring treats this as zero weight
 * (logged as a qualitative observation upstream).  Never silently guesses.
 */
export function labelToLetter(qc: QcCode, label: string | undefined): RowLetter | null {
  if (!label) return null;
  const map = OPTION_KEYS[qc];
  if (!map) return null;
  return map[label] ?? null;
}

/**
 * L030501 pain-scale (1–10) → row letter A (1) … J (10).
 * Per spec L030501 option key, 1=A … 10=J.
 */
export function painScaleLetter(scale: number | undefined): RowLetter | null {
  if (typeof scale !== 'number' || scale < 1 || scale > 10) return null;
  const letters: RowLetter[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  return letters[scale - 1] ?? null;
}

/**
 * Cohort a raw age into the L010301 band (A–F).
 * A: 0–30, B: 31–40, C: 41–50, D: 51–60, E: 61–70, F: >70.
 */
export function ageBand(ageYears: number): RowLetter {
  if (ageYears <= 30) return 'A';
  if (ageYears <= 40) return 'B';
  if (ageYears <= 50) return 'C';
  if (ageYears <= 60) return 'D';
  if (ageYears <= 70) return 'E';
  return 'F';
}

/**
 * Cohort a raw height into the L010501 band (A/B/C) using gender-aware thresholds.
 * Per spec Part II: A Short (M<165 / F<157), B Medium (M 166–178 / F 158–170),
 * C Tall (M>178 / F>170).  For Transgender/Prefer-not-to-say, uses the female
 * thresholds (more conservative for scoring that favours smaller stature).
 */
export function heightBand(cm: number, gender: string | undefined): RowLetter {
  const male = gender === 'Male';
  if (male) {
    if (cm < 166) return 'A';
    if (cm <= 178) return 'B';
    return 'C';
  }
  // Female / Transgender / Prefer not to say
  if (cm < 158) return 'A';
  if (cm <= 170) return 'B';
  return 'C';
}

/**
 * Cohort BMI into the L010601 band (A–F).
 * A: <18.5, B: 18.5–25, C: 25–30, D: 30–35, E: 35–40, F: >40.
 */
export function bmiBand(bmi: number): RowLetter {
  if (bmi < 18.5) return 'A';
  if (bmi < 25) return 'B';
  if (bmi < 30) return 'C';
  if (bmi < 35) return 'D';
  if (bmi < 40) return 'E';
  return 'F';
}
