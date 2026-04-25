/**
 * Kriya CDE — Deterministic scoring engine (CDE v4.1, Parts IV/V/VI).
 *
 * Pure functions: same PatientData → same outputs, byte-for-byte
 * (Part VIII reconstructability contract).
 *
 *   scoreAll(region, data)   — per-condition scoring + audit trace
 *   computeSeverity(data)    — Part VI severity rules
 *   computeConfidence(top3)  — gap-based confidence
 *   regionFromPrimary(label) — Part III region triggers
 *   applySafetyGates(...)    — 7 hard gates from Part VI
 *
 * Inviolable per Global Instructions:
 *   - No fuzzy matching.  Every score = sum of literal Part V weights.
 *   - No clinical judgment in extraction; this module IS the judgment layer.
 *   - Standing caveat is part of every result envelope.
 */

import { DB, FLAG_WEIGHT } from './conditions-db';
import { OPTION_KEYS, labelToLetter, painScaleLetter } from './option-keys';
import type {
  Condition,
  Confidence,
  ConditionWeights,
  EngineOutput,
  PatientData,
  QcCode,
  RegionKey,
  RowLetter,
  SafetyGateLog,
  ScoredCondition,
  ScoringContribution,
  SeverityBucket,
  SeverityResult,
} from './types';
import { ENGINE_VERSION, STANDING_CAVEAT } from './types';

// Region triggers (Part III)
//   Back     ← F (Lower back), G (Hips), H (Thigh above knee)
//   Neck     ← A (Neck),  E (Upper back)
//   Shoulder ← B (Shoulder), C (Arm above elbow), D (Arm below elbow)
//   Knee     ← I (Leg below knee), J (Ankle)   [H also valid for knee but Back wins by default]
export function regionFromPrimary(label: string | undefined): RegionKey | null {
  const letter = labelToLetter('L030201', label);
  if (!letter) return null;
  if (letter === 'L') return null;
  if (letter === 'F' || letter === 'G' || letter === 'H') return 'back';
  if (letter === 'A' || letter === 'E') return 'neck';
  if (letter === 'B' || letter === 'C' || letter === 'D') return 'shoulder';
  if (letter === 'I' || letter === 'J') return 'knee';
  return 'back';
}

// PatientData → {QC → row letters[]}
export function materialise(d: PatientData): Partial<Record<QcCode, RowLetter[]>> {
  const out: Partial<Record<QcCode, RowLetter[]>> = {};
  function add(qc: QcCode, letter: RowLetter | null): void {
    if (!letter) return;
    const arr = (out[qc] ??= []);
    if (!arr.includes(letter)) arr.push(letter);
  }
  function addLabel(qc: QcCode, label: string | undefined): void {
    add(qc, labelToLetter(qc, label));
  }
  function addLabels(qc: QcCode, labels: string[] | undefined): void {
    (labels ?? []).forEach((l) => add(qc, labelToLetter(qc, l)));
  }
  addLabel('L010401', d.L010401);
  if (d.L010301_band) add('L010301', d.L010301_band);
  if (d.L010501_band) add('L010501', d.L010501_band);
  if (d.L010601_band) add('L010601', d.L010601_band);
  addLabel('L010701', d.L010701);
  addLabel('L030101', d.L030101);
  addLabel('L030201', d.L030201);
  addLabel('L030201b', d.L030201b);
  addLabel('L030401', d.L030401);
  add('L030501', painScaleLetter(d.L030501));
  addLabel('L030601', d.L030601);
  addLabel('L030701', d.L030701);
  addLabels('L030801', d.L030801);
  addLabel('L030901', d.L030901);
  addLabels('L031001', d.L031001);
  addLabel('L031002', d.L031002);
  addLabel('L031003', d.L031003);
  addLabel('L031004', d.L031004);
  addLabel('L031005', d.L031005);
  addLabel('L031006', d.L031006);
  addLabel('L031007', d.L031007);
  addLabel('L031008', d.L031008);
  addLabel('L031009', d.L031009);
  addLabel('L031010', d.L031010);
  addLabel('L031011', d.L031011);
  addLabel('L150101', d.L150101);
  addLabel('L150102', d.L150102);
  addLabels('L170101', d.L170101);
  addLabels('L170201', d.L170201);
  addLabel('L170301', d.L170301);
  addLabel('L170302', d.L170302);
  addLabel('L190101', d.L190101);
  addLabel('L190201', d.L190201);
  addLabel('L190202', d.L190202);
  addLabel('L210101', d.L210101);
  addLabel('L210102', d.L210102);
  addLabel('L230101', d.L230101);
  addLabel('L230102', d.L230102);
  return out;
}

// Score one condition against materialised answers — sum literal Part V weights.
export function scoreCondition(
  cond: Condition,
  answers: Partial<Record<QcCode, RowLetter[]>>,
): ScoredCondition {
  let total = 0;
  const trace: ScoringContribution[] = [];
  const qcsHit = new Set<QcCode>();
  (Object.keys(answers) as QcCode[]).forEach((qc) => {
    const rowsTable = (cond.weights as ConditionWeights)[qc];
    if (!rowsTable) return;
    (answers[qc] ?? []).forEach((letter) => {
      const w = rowsTable[letter] ?? 0;
      if (w !== 0) {
        total += w;
        trace.push({ qc, row: letter, weight: w });
        qcsHit.add(qc);
      }
    });
  });
  return {
    name: cond.name,
    flag: cond.flag,
    score: total,
    trace,
    distinctQcMatches: qcsHit.size,
  };
}

export function scoreRegion(
  region: RegionKey,
  answers: Partial<Record<QcCode, RowLetter[]>>,
): ScoredCondition[] {
  return DB[region]
    .map((c) => scoreCondition(c, answers))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return FLAG_WEIGHT[b.flag] - FLAG_WEIGHT[a.flag];
    });
}

// Severity (Part VI)
const PAIN_BAND_POINTS = (scale: number): number => {
  if (scale >= 1 && scale <= 3) return 1;
  if (scale >= 4 && scale <= 6) return 2;
  if (scale >= 7 && scale <= 8) return 3;
  if (scale >= 9 && scale <= 10) return 4;
  return 0;
};

export function computeSeverity(d: PatientData): SeverityResult {
  let total = 0;
  const contributors: { input: string; points: number }[] = [];
  const push = (input: string, points: number): void => {
    if (!points) return;
    total += points;
    contributors.push({ input, points });
  };
  if (typeof d.L030501 === 'number') {
    push('L030501 pain scale ' + d.L030501, PAIN_BAND_POINTS(d.L030501));
  }
  const descLetter = labelToLetter('L030401', d.L030401);
  if (descLetter === 'D' || descLetter === 'E') {
    push('L030401 row ' + descLetter + ' (severe/crippling pain)', 2);
  }
  const symLetters = new Set<RowLetter>();
  (d.L030801 ?? []).forEach((s) => {
    const l = labelToLetter('L030801', s);
    if (l) symLetters.add(l);
  });
  if (symLetters.has('B')) push('L030801 row B (tingling / numbness)', 2);
  if (symLetters.has('C')) push('L030801 row C (weakness)', 3);
  if (symLetters.has('D')) push('L030801 row D (bowel/bladder/sexual dysfunction)', 4);
  if (labelToLetter('L031008', d.L031008) === 'A') {
    push('L031008 row A (night pain forces out of bed)', 2);
  }
  if (labelToLetter('L031009', d.L031009) === 'C') {
    push('L031009 row C (fever > 101F)', 2);
  }
  let bucket: SeverityBucket;
  if (total <= 3) bucket = 'Mild';
  else if (total <= 6) bucket = 'Moderate';
  else if (total <= 9) bucket = 'Severe';
  else bucket = 'Emergency';
  return { total, bucket, contributors };
}

export function computeConfidence(top: ScoredCondition[]): Confidence {
  if (top.length < 2) return 'Low';
  const gap = top[0].score - top[1].score;
  if (gap >= 4) return 'High';
  if (gap >= 2) return 'Moderate';
  return 'Low';
}

const BUCKET_RANK: Record<SeverityBucket, number> = {
  Mild: 0,
  Moderate: 1,
  Severe: 2,
  Emergency: 3,
};
function bucketAtLeast(b: SeverityBucket, min: SeverityBucket): SeverityBucket {
  return BUCKET_RANK[b] >= BUCKET_RANK[min] ? b : min;
}

export interface GateInput {
  region: RegionKey | null;
  scored: ScoredCondition[];
  severity: SeverityResult;
  confidence: Confidence;
  data: PatientData;
  answers: Partial<Record<QcCode, RowLetter[]>>;
}

export interface GateOutput {
  scored: ScoredCondition[];
  severity: SeverityResult;
  confidence: Confidence;
  banner?: { tone: 'emergency' | 'urgent'; text: string };
  gates: SafetyGateLog;
}

// Apply 7 safety gates from spec Part VI in deterministic order.
export function applySafetyGates(input: GateInput): GateOutput {
  const gates: SafetyGateLog = {
    noPainShortCircuit: false,
    caudaEquinaForced: false,
    bowelBladderFloor: false,
    redFlagGated: [],
    postSurgicalBoosted: null,
    pregnancyGate: false,
    feverBackInfectionForced: false,
    contradictionEscalated: false,
  };
  let { scored, severity, confidence } = input;
  let banner: GateOutput['banner'];

  const symLetters = new Set<RowLetter>();
  (input.data.L030801 ?? []).forEach((s) => {
    const l = labelToLetter('L030801', s);
    if (l) symLetters.add(l);
  });

  // Gate 2: Cauda equina heuristic — weakness (C) AND bowel/bladder (D) → force Emergency.
  if (symLetters.has('C') && symLetters.has('D')) {
    gates.caudaEquinaForced = true;
    severity = { ...severity, bucket: 'Emergency', flooredBy: 'cauda equina heuristic' };
    confidence = 'High';
    banner = {
      tone: 'emergency',
      text:
        'You have reported leg weakness AND loss of bowel/bladder/sexual control. ' +
        'These can indicate a time-critical spinal emergency (cauda equina). ' +
        'Please seek emergency medical care immediately — do not delay.',
    };
  }

  // Gate 3: Bowel/bladder severity floor (Severe minimum if D selected).
  if (symLetters.has('D') && BUCKET_RANK[severity.bucket] < BUCKET_RANK.Severe) {
    severity = {
      ...severity,
      bucket: bucketAtLeast(severity.bucket, 'Severe'),
      flooredBy: severity.flooredBy ?? 'bowel/bladder floor',
    };
    gates.bowelBladderFloor = true;
  }

  // Gate 4: Red-flag feature gating.
  if (scored.length > 0 && scored[0].flag === 'red') {
    const nonRed = scored.filter((s) => s.flag !== 'red').slice(0, 2);
    if (nonRed.length >= 1) {
      const avgNext = nonRed.reduce((a, c) => a + c.score, 0) / nonRed.length;
      const dominant = scored[0].score > avgNext + 3;
      const enoughFeatures = scored[0].distinctQcMatches >= 2;
      if (!dominant || !enoughFeatures) {
        const cap = Math.max(0, nonRed[0].score - 0.1);
        const suppressed = { ...scored[0], score: cap, gateApplied: 'red-flag gating' };
        gates.redFlagGated.push(scored[0].name);
        scored = [suppressed, ...scored.slice(1)].sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return FLAG_WEIGHT[b.flag] - FLAG_WEIGHT[a.flag];
        });
      }
    }
  }

  // Gate 5: Recent-surgery boost (+5 to matching Post-Surgical condition).
  const surgeryLetter = labelToLetter('L170301', input.data.L170301);
  const surgeryRecent = labelToLetter('L170302', input.data.L170302) === 'A';
  if (surgeryLetter && surgeryLetter !== 'F' && surgeryRecent) {
    const target = scored.find((c) => /post[- ]?surgical/i.test(c.name));
    if (target) {
      target.score += 5;
      target.gateApplied = (target.gateApplied ? target.gateApplied + '; ' : '') + 'recent-surgery +5 boost';
      gates.postSurgicalBoosted = target.name;
    }
  }

  // Gate 6: Pregnancy gate (suppress spinal-manipulation suggestions in action text).
  if (labelToLetter('L031002', input.data.L031002) === 'A') {
    gates.pregnancyGate = true;
  }

  // Gate 7: Fever + back/neck pattern → force Infection top-3, raise to Severe.
  if (
    labelToLetter('L031009', input.data.L031009) === 'C' &&
    (input.region === 'back' || input.region === 'neck')
  ) {
    const infectionName = input.region === 'back' ? 'Infection' : 'Infection – Herpes/ UTI/ TB/ Others';
    const infIdx = scored.findIndex((c) => c.name === infectionName);
    if (infIdx >= 0) {
      const inf = scored[infIdx];
      if (infIdx >= 3) {
        scored.splice(infIdx, 1);
        scored.splice(2, 0, { ...inf, gateApplied: 'fever+back/neck → infection forced top-3' });
      } else {
        inf.gateApplied = (inf.gateApplied ? inf.gateApplied + '; ' : '') + 'fever+back/neck → infection forced top-3';
      }
      gates.feverBackInfectionForced = true;
    }
    severity = {
      ...severity,
      bucket: bucketAtLeast(severity.bucket, 'Severe'),
      flooredBy: severity.flooredBy ?? 'fever+back/neck infection pattern',
    };
  }

  // Gate 8: Contradiction escalator — wired by extract pipeline upstream.

  scored = scored.slice().sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return FLAG_WEIGHT[b.flag] - FLAG_WEIGHT[a.flag];
  });

  return { scored, severity, confidence, banner, gates };
}

function actionForBucket(b: SeverityBucket, pregnancy: boolean): string {
  const preg = pregnancy
    ? ' Note: pregnancy detected — please ensure any clinical advice considers pregnancy-safe options. Avoid spinal manipulation suggestions until cleared by your obstetrician.'
    : '';
  switch (b) {
    case 'Mild':
      return 'Self-management guidance is appropriate at this stage. Persistent or worsening symptoms should be reviewed by a qualified clinician.' + preg;
    case 'Moderate':
      return 'Clinician consultation is recommended within the next few days. A primary-care doctor or MSK physiotherapist would be the right starting point.' + preg;
    case 'Severe':
      return 'Prompt clinician consultation within 24-48 hours is recommended. If a neurological symptom (weakness, numbness, balance loss) was reported, please seek in-person assessment by a specialist.' + preg;
    case 'Emergency':
      return 'This is an urgent / emergency presentation. Please do not self-manage — seek immediate clinical review or emergency care.' + preg;
  }
}

// Public entry point — runEngine
export function runEngine(d: PatientData): EngineOutput {
  if (labelToLetter('L030201', d.L030201) === 'L') {
    return {
      noPain: true,
      action: 'You reported no pain. Routing you to the Kriya 360 wellness module so you can continue building strength, flexibility and balance proactively.',
      disclaimer: STANDING_CAVEAT,
      engineVersion: ENGINE_VERSION,
    };
  }
  const region = regionFromPrimary(d.L030201);
  if (!region) {
    return {
      noPain: true,
      action: 'We could not identify a primary pain region from your responses. Please revisit the region question so we can complete the risk assessment.',
      disclaimer: STANDING_CAVEAT,
      engineVersion: ENGINE_VERSION,
    };
  }
  const answers = materialise(d);
  const scoredRaw = scoreRegion(region, answers);
  const severityRaw = computeSeverity(d);
  const confidenceRaw = computeConfidence(scoredRaw);
  const gated = applySafetyGates({
    region,
    scored: scoredRaw,
    severity: severityRaw,
    confidence: confidenceRaw,
    data: d,
    answers,
  });
  const top3 = gated.scored.slice(0, 3);
  const scoresMap: Record<string, number> = {};
  gated.scored.forEach((c) => {
    scoresMap[c.name] = c.score;
  });
  return {
    user: { age: d.L010301, gender: d.L010401, bmi: d.bmi },
    pain: {
      region: d.L030201,
      duration: d.L150101,
      scale: d.L030501,
      description: d.L030401,
      feeling: d.L030601,
    },
    severity: gated.severity,
    scores: scoresMap,
    top_3: top3,
    confidence: gated.confidence,
    action: actionForBucket(gated.severity.bucket, gated.gates.pregnancyGate),
    banner: gated.banner,
    disclaimer: STANDING_CAVEAT,
    engineVersion: ENGINE_VERSION,
    gates: gated.gates,
  };
}

// Display helpers
export function severityColor(b: SeverityBucket): string {
  return b === 'Emergency' ? '#ef4444' : b === 'Severe' ? '#f97316' : b === 'Moderate' ? '#f59e0b' : '#22c55e';
}
export function flagColor(f: 'red' | 'yellow' | 'green'): string {
  return f === 'red' ? '#ef4444' : f === 'yellow' ? '#f59e0b' : '#22c55e';
}
export function flagLabel(f: 'red' | 'yellow' | 'green'): string {
  return f === 'red' ? 'Red Flag' : f === 'yellow' ? 'Yellow Flag' : 'Green Flag';
}

// Legacy adapter — old callers (DiagnosticsChat, etc.)
export function mapRegion(region: string | undefined): RegionKey {
  return regionFromPrimary(region) ?? 'back';
}
export function scoreAll(region: RegionKey, d: PatientData): { name: string; score: number; flag: 'red' | 'yellow' | 'green' }[] {
  const answers = materialise(d);
  return scoreRegion(region, answers).map(({ name, score, flag }) => ({ name, score, flag }));
}
export function severity(d: PatientData): SeverityResult {
  return computeSeverity(d);
}
