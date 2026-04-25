/**
 * Kriya CDE — Core Types (CDE v4.1).
 *
 * Three-layer architecture (per Global Instructions):
 *   Layer 1 — LLM extracts structured fields.  Layer 2 — deterministic CDE
 *   computes risk.  Layer 3 — LLM formats output.  These types live in Layer 2.
 *
 * Key invariants:
 *   - Every condition score is a sum of literal weights from Part V.  No fuzzy
 *     matching, no heuristic bonuses outside the gate set.
 *   - PatientData keys are stable QC codes — never rename.  Add new keys for
 *     new fields (band-cohort outputs, follow-ups) instead of repurposing
 *     existing ones.
 *   - Every result must carry a standing non-suppressible caveat.
 */

// Flags & regions
export type Flag = 'red' | 'yellow' | 'green';
export type RegionKey = 'back' | 'neck' | 'shoulder' | 'knee';

/** Row letters used across the option key (A through L). */
export type RowLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';

/** Every QC code used by the spec (Part II). */
export type QcCode =
  | 'L010401' | 'L010301' | 'L010501' | 'L010601' | 'L010701' | 'L030101'
  | 'L030201' | 'L030201b' | 'L030401' | 'L030501' | 'L030601' | 'L030701'
  | 'L030801' | 'L030901' | 'L031001'
  | 'L031002' | 'L031003' | 'L031004' | 'L031005' | 'L031006'
  | 'L031007' | 'L031008' | 'L031009' | 'L031010' | 'L031011'
  | 'L150101' | 'L150102' | 'L170101' | 'L170201' | 'L170301' | 'L170302'
  | 'L190101' | 'L190201' | 'L190202' | 'L210101' | 'L210102'
  | 'L230101' | 'L230102';

/** Per-condition weight table.  Missing (QC,row) entries contribute zero. */
export type ConditionWeights = Partial<Record<QcCode, Partial<Record<RowLetter, number>>>>;

export interface Condition {
  name: string;
  flag: Flag;
  weights: ConditionWeights;
}

export type ConditionsDB = Record<RegionKey, Condition[]>;

/**
 * Patient answers.  Single-choice fields hold one chip text label.  Multi-choice
 * fields hold a string[].  Numeric fields hold the raw value as a string (age) or
 * number (BMI / pain scale).  The `_band` keys are populated by the LLM cohorter
 * (Part I.2 mandate 2, numeric → band).  Scoring reads `_band` keys, NOT the raw
 * numeric fields.  Per Global Instructions: never rename a key.
 */
export interface PatientData {
  L010401?: 'Male' | 'Female' | 'Transgender' | 'Prefer not to say';
  L010301?: string;
  L010301_band?: RowLetter;
  L010501?: string;
  L010501_band?: RowLetter;
  L010601?: string;
  L010601_band?: RowLetter;
  bmi?: number;
  /** @deprecated Pre-v4.1 paired-input field. v4.1 uses L010501 + L010601. */
  height?: string;
  /** @deprecated Pre-v4.1 paired-input field. v4.1 uses L010501 + L010601. */
  weight?: string;
  L010701?: string;
  L030101?: string;
  L030201?: string;
  L030201b?: string;
  L030401?: string;
  L030501?: number;
  L030601?: string;
  L030701?: string;
  L030801?: string[];
  L030901?: string;
  L031001?: string[];
  // Co-morbidity follow-ups (canonical QC codes per spec Annex A — replaces
  // the legacy `FU_<condition>` string keys).
  L031002?: string;
  L031003?: string;
  L031004?: string;
  L031005?: string;
  L031006?: string;
  L031007?: string;
  L031008?: string;
  L031009?: string;
  L031010?: string;
  L031011?: string;
  L150101?: string;
  L150102?: 'Yes' | 'No';
  L170101?: string[];
  L170201?: string[];
  L170301?: string;
  L170302?: string;
  L190101?: string;
  L190201?: string;
  L190202?: string;
  L210101?: string;
  L210102?: string;
  L230101?: string;
  L230102?: string;
  /** Legacy free-form follow-ups (pre-v4.1).  Kept for back-compat reads only. */
  [key: `FU_${string}`]: string | undefined;
}

export interface ScoringContribution {
  qc: QcCode;
  row: RowLetter;
  weight: number;
}

export interface ScoredCondition {
  name: string;
  score: number;
  flag: Flag;
  /** Audit trace — every (QC, row, weight) that contributed.  Required by Part VIII. */
  trace: ScoringContribution[];
  /** Distinct QC codes that contributed at least one non-zero weight (red-flag gate). */
  distinctQcMatches: number;
  /** True if this condition was suppressed/promoted by a safety gate. */
  gateApplied?: string;
}

export type SeverityBucket = 'Mild' | 'Moderate' | 'Severe' | 'Emergency';

export interface SeverityResult {
  total: number;
  bucket: SeverityBucket;
  contributors: { input: string; points: number }[];
  flooredBy?: string;
}

export type Confidence = 'High' | 'Moderate' | 'Low';

export interface SafetyGateLog {
  noPainShortCircuit: boolean;
  caudaEquinaForced: boolean;
  bowelBladderFloor: boolean;
  redFlagGated: string[];
  postSurgicalBoosted: string | null;
  pregnancyGate: boolean;
  feverBackInfectionForced: boolean;
  contradictionEscalated: boolean;
}

/** Standing caveat — every ResultCard MUST display this exact text (Part VII). */
export const STANDING_CAVEAT =
  'This is a risk assessment, not a diagnosis. Please consult a qualified clinician to confirm the cause of your symptoms and decide on treatment.';

/** Engine version stamp for audit (Part VIII reconstructability contract). */
export const ENGINE_VERSION = 'CDE-v4.1';

export interface DiagnosticResult {
  user: { age?: string; gender?: string; bmi?: number };
  pain: {
    region?: string;
    duration?: string;
    scale?: number;
    description?: string;
    feeling?: string;
  };
  severity: SeverityResult;
  scores: Record<string, number>;
  top_3: ScoredCondition[];
  confidence: Confidence;
  action: string;
  banner?: { tone: 'emergency' | 'urgent'; text: string };
  disclaimer: string;
  qualitativeObservations?: string[];
  engineVersion: string;
  gates: SafetyGateLog;
  noPain?: undefined;
}

export interface NoPainResult {
  noPain: true;
  action: string;
  disclaimer: string;
  engineVersion: string;
}

export type EngineOutput = DiagnosticResult | NoPainResult;

export interface BmiInsight {
  t: string;
  m: string;
  c: string;
  e: string;
}

export interface ActivityInsight {
  t: string;
  items: string[];
  c: string;
}

export type ChatEntry =
  | { id: string; role: 'bot'; kind: 'text'; text: string }
  | { id: string; role: 'bot'; kind: 'insight'; emoji: string; text: string; color: string }
  | { id: string; role: 'bot'; kind: 'bmi'; insight: BmiInsight; bmi: number }
  | { id: string; role: 'bot'; kind: 'mini-diagnosis'; insight: ActivityInsight }
  | { id: string; role: 'bot'; kind: 'severity'; severity: SeverityResult }
  | { id: string; role: 'bot'; kind: 'red-flag'; text: string }
  | { id: string; role: 'bot'; kind: 'result'; result: EngineOutput }
  | { id: string; role: 'bot'; kind: 'thinking'; text: string }
  | {
      id: string;
      role: 'bot';
      kind: 'chips-question';
      prompt?: string;
      options: string[];
      multi: boolean;
      resolved?: string | string[];
    }
  | {
      id: string;
      role: 'bot';
      kind: 'extraction-summary';
      labels: { key: string; label: string }[];
      patches: Partial<PatientData> & { height?: string; weight?: string };
      notes?: string;
      resolved?: 'confirmed' | 'edited';
    }
  | { id: string; role: 'user'; kind: 'text'; text: string };
