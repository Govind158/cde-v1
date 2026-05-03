/**
 * Kriya CDE — Deterministic scoring engine (CDE v4.4, Parts IV/V/VI).
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
//   Knee     ← I (Leg below knee), J (Knee or Ankle)   [H also valid for knee but Back wins by default]
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

/**
 * Final ranking comparator. Suppressed-red items are pushed below all
 * non-suppressed (Gate 4 — see applySafetyGates). Otherwise: descending by
 * score, then by flag urgency for tie-break (RED > YELLOW > GREEN).
 */
function rankComparator(a: ScoredCondition, b: ScoredCondition): number {
  const aSup = a.suppressed ? 1 : 0;
  const bSup = b.suppressed ? 1 : 0;
  if (aSup !== bSup) return aSup - bSup;
  if (b.score !== a.score) return b.score - a.score;
  return FLAG_WEIGHT[b.flag] - FLAG_WEIGHT[a.flag];
}

export function scoreRegion(
  region: RegionKey,
  answers: Partial<Record<QcCode, RowLetter[]>>,
): ScoredCondition[] {
  return DB[region].map((c) => scoreCondition(c, answers)).sort(rankComparator);
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

/**
 * Spec Part VI — apply the 9 safety gates in deterministic order.
 *
 * Gate numbering here follows Part VI:
 *   1. No-pain short-circuit (handled in runEngine before gates run).
 *   2. Cauda equina heuristic.
 *   3. Bowel/bladder severity floor.
 *   4. Red-flag feature gating (iterative — see ENGINE-BUG-1 fix).
 *   5. Recent-surgery boost.
 *   6. Pregnancy gate (action-text safety note).
 *   7. Fever + back/neck → Infection top-3 floor + Severe minimum.
 *   8. Contradiction escalator (NEW — spec Part VI; ENGINE-BUG MISSING-GATE-1).
 *   9. Red-flag top-1 → severity floor (NEW — defensive safety; MISSING-GATE-2).
 */
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

  // Gate 4: Red-flag feature gating — iterative until top-1 is non-red OR a red passes
  // the dominance test. ENGINE-BUG-1 fix: previous one-shot version allowed a second red
  // (with the same single-feature pattern) to be promoted to rank-1 unchecked.
  // ENGINE-BUG-3 fix: scores are NO LONGER mutated; the suppressed flag pushes the item
  // below all non-suppressed candidates via rankComparator. This preserves confidence math.
  let safety = 0;
  while (scored.length > 0 && scored[0].flag === 'red' && !scored[0].suppressed && safety++ < 8) {
    const nonRedNotSuppressed = scored.filter((s) => s.flag !== 'red' && !s.suppressed).slice(0, 2);
    if (nonRedNotSuppressed.length === 0) break; // pool has no non-reds; no comparator
    const avgNext = nonRedNotSuppressed.reduce((a, c) => a + c.score, 0) / nonRedNotSuppressed.length;
    const dominant = scored[0].score > avgNext + 3;
    const enoughFeatures = scored[0].distinctQcMatches >= 2;
    if (dominant && enoughFeatures) break;
    // Suppress the red top — flag it, do not mutate score.
    const updated = { ...scored[0], suppressed: true, gateApplied:
      (scored[0].gateApplied ? scored[0].gateApplied + '; ' : '') + 'red-flag gating' };
    gates.redFlagGated.push(scored[0].name);
    scored = [updated, ...scored.slice(1)].sort(rankComparator);
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

  // Gate 7: Fever + back/neck pattern → force Infection-bearing red flag top-3, raise to Severe.
  // Back: post-v4.4 the merged red flag is 'Cancer / Infection' (Annex F C1).
  // Neck: 'Infection – Herpes/ UTI/ TB/ Others' remains a separate condition.
  if (
    labelToLetter('L031009', input.data.L031009) === 'C' &&
    (input.region === 'back' || input.region === 'neck')
  ) {
    const infectionName = input.region === 'back' ? 'Cancer / Infection' : 'Infection – Herpes/ UTI/ TB/ Others';
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

  // Gate 8: Contradiction escalator (Spec Part VI). MISSING-GATE-1 fix.
  // Spec text: "If the user's free-text extraction contradicts a chip answer (e.g. activity
  // listed as both aggravator and reliever), route to human-in-the-loop review instead of
  // scoring." We DO NOT halt scoring — the deterministic ranking still runs — but we record
  // the contradiction in the audit log, downgrade confidence, and surface a clinician-review
  // banner so the result is never presented as decisive.
  const contradictions = detectContradictions(input.data);
  if (contradictions.length > 0) {
    gates.contradictionEscalated = true;
    gates.contradictions = contradictions;
    // Downgrade one step (per spec mandate for missing/skipped data — same downgrade policy).
    if (confidence === 'High') confidence = 'Moderate';
    else if (confidence === 'Moderate') confidence = 'Low';
    if (!banner) {
      banner = {
        tone: 'urgent',
        text:
          'Some of your responses appeared to conflict (' + contradictions.join('; ') +
          '). The deterministic ranking is still shown for reference, but please review with ' +
          'a clinician — answers that point in opposite directions can change the recommendation.',
      };
    }
  }

  // Gate 9: Red-flag top-1 → severity floor (defensive medicine; MISSING-GATE-2 fix).
  // A red-flag rank-1 condition that PASSED Gate 4 dominance must never end up paired with
  // 'Mild' self-management guidance. Floor severity to Moderate (clinician consultation
  // within days). If the top-1 was suppressed by Gate 4, this floor does NOT apply.
  if (
    scored.length > 0 &&
    scored[0].flag === 'red' &&
    !scored[0].suppressed &&
    BUCKET_RANK[severity.bucket] < BUCKET_RANK.Moderate
  ) {
    severity = {
      ...severity,
      bucket: bucketAtLeast(severity.bucket, 'Moderate'),
      flooredBy: severity.flooredBy ?? 'red-flag rank-1 floor',
    };
    gates.redFlagSeverityFloor = true;
  }

  // Final sort (suppressed-red goes below non-suppressed).
  scored = scored.slice().sort(rankComparator);

  return { scored, severity, confidence, banner, gates };
}

/**
 * Detect contradictions in PatientData per Gate 8.
 * Returns a list of human-readable strings, empty if none.
 *
 * Patterns checked (each is conservative — only fires on direct, unambiguous conflict):
 *   (a) L030701 = D (pain doesn't increase) AND L190201 ≠ F (an aggravator was selected).
 *   (b) Same activity selected as both aggravator (L190201) and reliever (L210101).
 *       The L190201 ↔ L210101 cross-map below is anatomical-row-level, not fuzzy.
 *   (c) L030801 contains 'None' AND any other symptom selection.
 */
function detectContradictions(d: PatientData): string[] {
  const out: string[] = [];
  const a701 = labelToLetter('L030701', d.L030701);
  const a190 = labelToLetter('L190201', d.L190201);
  if (a701 === 'D' && a190 && a190 !== 'F') {
    out.push("L030701='Pain doesn't increase' but L190201 names an aggravator");
  }
  // Activity-level cross-map between L190201 and L210101.
  // Sitting: L190201 row C ↔ L210101 row B. Walking/standing/mobility: L190201 row B ↔
  // L210101 rows C/D (standing/walking). Exercise/sports: L190201 row E ↔ L210101 row H.
  const cross: Array<[RowLetter, RowLetter, string]> = [
    ['C', 'B', 'sitting'],
    ['B', 'D', 'walking'],
    ['B', 'C', 'standing'],
    ['E', 'H', 'exercise/working out'],
  ];
  const a210 = labelToLetter('L210101', d.L210101);
  if (a190 && a210) {
    for (const [agg, rel, label] of cross) {
      if (a190 === agg && a210 === rel) {
        out.push('activity \u201c' + label + '\u201d selected as both aggravator and reliever');
      }
    }
  }
  // Symptoms-list contradiction: 'None' selected together with any other symptom.
  const sym = (d.L030801 ?? []).map((s) => labelToLetter('L030801', s)).filter(Boolean) as RowLetter[];
  if (sym.includes('G') && sym.length > 1) {
    out.push("L030801 list includes 'None' together with at least one other symptom");
  }
  return out;
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
      return 'This is an urgent / emergency presentation. Please do not self-manage \u2014 seek immediate clinical review or emergency care.' + preg;
  }
}

/** Empty gate log used by the no-pain short-circuit branches. */
function emptyGateLog(): SafetyGateLog {
  return {
    noPainShortCircuit: false,
    caudaEquinaForced: false,
    bowelBladderFloor: false,
    redFlagGated: [],
    postSurgicalBoosted: null,
    pregnancyGate: false,
    feverBackInfectionForced: false,
    contradictionEscalated: false,
  };
}

// Public entry point — runEngine
export function runEngine(d: PatientData): EngineOutput {
  // Gate 1: No-pain short-circuit. Per spec Part VI, route to Kriya 360 wellness module.
  if (labelToLetter('L030201', d.L030201) === 'L') {
    const g = emptyGateLog();
    g.noPainShortCircuit = true;
    return {
      noPain: true,
      action: 'You reported no pain. Routing you to the Kriya 360 wellness module so you can continue building strength, flexibility and balance proactively.',
      disclaimer: STANDING_CAVEAT,
      engineVersion: ENGINE_VERSION,
      gates: g,
    };
  }
  const region = regionFromPrimary(d.L030201);
  if (!region) {
    return {
      noPain: true,
      action: 'We could not identify a primary pain region from your responses. Please revisit the region question so we can complete the risk assessment.',
      disclaimer: STANDING_CAVEAT,
      engineVersion: ENGINE_VERSION,
      gates: emptyGateLog(),
    };
  }
  const answers = materialise(d);
  const scoredRaw = scoreRegion(region, answers);
  const severityRaw = computeSeverity(d);
  // ENGINE-BUG-2 fix: confidence is computed AFTER gates run, because Gates 4/5/7
  // can re-order results. The pre-gate value is only seeded so applySafetyGates can
  // override it (Gate 2 sets High; Gate 8 downgrades).
  const confidenceSeed = computeConfidence(scoredRaw);
  const gated = applySafetyGates({
    region,
    scored: scoredRaw,
    severity: severityRaw,
    confidence: confidenceSeed,
    data: d,
    answers,
  });
  // Recompute confidence on the post-gate ordering UNLESS a gate explicitly forced it
  // (Gate 2 -> High, Gate 8 -> downgraded). We detect a gate override by comparing seed
  // to gated; if equal, no gate touched confidence so we recompute on actual ranks.
  let confidence: Confidence = gated.confidence;
  if (gated.confidence === confidenceSeed) {
    confidence = computeConfidence(gated.scored);
  }
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
    confidence,
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
