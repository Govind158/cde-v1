/**
 * Kriya QuickScan — Deterministic Engine (Layer 2)
 *
 * Pure functions only. Given (module, answers) produces a QSResult.
 * No LLM. No clinical reasoning beyond the literal weights/rules in the
 * module spec. Per the inviolable architecture rules:
 *   - Red flags halt the scan; no score is computed.
 *   - Hard flags promote to HIGH regardless of numeric score.
 *   - All decisions are reproducible — audit log = full contributions list.
 */

import type {
  QSAnswers,
  QSHaltResult,
  QSHardFlag,
  QSModule,
  QSQuestion,
  QSResult,
  QSScoreContribution,
  QSTier,
  QSTierResult,
} from './types';

// ── Answer helpers ─────────────────────────────────────────────────

export function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

export function asArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  return [];
}

export function asMatrix(v: unknown): Record<string, string> {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(v)) {
      if (typeof val === 'string') out[k] = val;
    }
    return out;
  }
  return {};
}

// ── Visibility ──────────────────────────────────────────────────────

/** Visible questions = those with no showWhen, or showWhen(answers) === true. */
export function visibleQuestions(module: QSModule, answers: QSAnswers): QSQuestion[] {
  return module.questions.filter((q) => !q.showWhen || q.showWhen(answers));
}

// ── Red-flag halt ───────────────────────────────────────────────────

/**
 * Walk Layer-0 multi-halt questions in order. Return halt-result if any
 * non-haltLabel option was selected. The first halt encountered short-
 * circuits the scan (per PRD: "halts the questionnaire immediately").
 */
export function evaluateHalt(module: QSModule, answers: QSAnswers): QSHaltResult | null {
  for (const q of module.questions) {
    if (q.layer !== 0 || q.kind !== 'multi-halt') continue;
    const sel = asArray(answers[q.id]);
    if (sel.length === 0) continue;

    const safe = q.haltLabel ?? 'None of the above';
    const triggers = sel.filter((s) => s !== safe);
    if (triggers.length === 0) continue;

    // If per-option halt-kind is configured, the most severe wins (emergency > urgent).
    let kind = q.haltKind ?? 'urgent';
    if (q.optionHaltKind) {
      for (const t of triggers) {
        if (q.optionHaltKind[t] === 'emergency') {
          kind = 'emergency';
          break;
        }
        if (q.optionHaltKind[t] === 'urgent' && kind !== 'emergency') {
          kind = 'urgent';
        }
      }
    }

    const heading =
      kind === 'emergency'
        ? 'Please seek emergency care now'
        : 'Please book an urgent specialist consult within 24–48 hours';

    const body =
      kind === 'emergency'
        ? [
            'Your responses include signals that require immediate clinical attention. Do not continue this scan.',
            'Visit the nearest A&E / casualty department, or call your country emergency helpline (102 / 108 in India).',
            'If a trusted person is with you, please ask them to accompany you.',
          ]
        : [
            'Your responses include signals that warrant clinical evaluation within the next 24–48 hours.',
            'Please book a specialist appointment or visit your treating physician promptly.',
            'If your symptoms worsen suddenly, escalate to emergency care.',
          ];

    return {
      halted: true,
      haltKind: kind,
      triggerQuestionId: q.id,
      triggerOptions: triggers,
      heading,
      body,
      helplineCTAs:
        kind === 'emergency'
          ? [{ label: 'Urgently book a specialist care', type: 'navigate' }]
          : [{ label: 'Urgently book a specialist care', type: 'navigate' }],
      disclaimer: module.disclaimer,
      moduleId: module.id,
    };
  }
  return null;
}

// ── Scoring ─────────────────────────────────────────────────────────

interface ScoreSummary {
  total: number;
  contributions: QSScoreContribution[];
}

/**
 * Sum points across all visible scored questions. Layer 0 contributes 0.
 * Matrix questions: per-row 0-3 plus optional sub-score bonus.
 */
export function scoreModule(module: QSModule, answers: QSAnswers): ScoreSummary {
  const contributions: QSScoreContribution[] = [];
  let total = 0;

  for (const q of visibleQuestions(module, answers)) {
    if (q.layer === 0) continue;

    if (q.kind === 'single-scored') {
      const sel = asString(answers[q.id]);
      if (!sel) continue;
      const opt = q.options?.find((o) => o.label === sel);
      if (opt && opt.points !== 0) {
        contributions.push({
          questionId: q.id,
          layer: q.layer,
          points: opt.points,
          source: `option:${opt.label}`,
        });
        total += opt.points;
      }
      continue;
    }

    if (q.kind === 'multi-scored') {
      const sel = asArray(answers[q.id]);
      for (const label of sel) {
        const opt = q.options?.find((o) => o.label === label);
        if (opt && opt.points !== 0) {
          contributions.push({
            questionId: q.id,
            layer: q.layer,
            points: opt.points,
            source: `option:${opt.label}`,
          });
          total += opt.points;
        }
      }
      continue;
    }

    if (q.kind === 'matrix-scored') {
      const m = asMatrix(answers[q.id]);
      let subTotal = 0;
      for (const sub of q.subItems ?? []) {
        const r = m[sub.id];
        const points = MATRIX_POINTS[r ?? ''] ?? 0;
        if (points !== 0) {
          contributions.push({
            questionId: q.id,
            layer: q.layer,
            points,
            source: `matrix:${sub.id}=${r}`,
          });
        }
        subTotal += points;
      }
      total += subTotal;
      // Sub-score bonus
      const t = q.matrixSubScoreThreshold;
      if (t && subTotal >= t.min && t.bonusPoints !== 0) {
        contributions.push({
          questionId: q.id,
          layer: q.layer,
          points: t.bonusPoints,
          source: `sub-score-bonus(>=${t.min})`,
        });
        total += t.bonusPoints;
      }
      continue;
    }
  }

  return { total, contributions };
}

const MATRIX_POINTS: Record<string, number> = {
  'Not at all': 0,
  'A little': 1,
  'Quite a bit': 2,
  'Cannot do at all': 3,
};

// ── Tier mapping ────────────────────────────────────────────────────

export function mapTier(module: QSModule, total: number): QSTier {
  const { lowMax, moderateMax } = module.tiers;
  if (total <= lowMax) return 'low';
  if (total <= moderateMax) return 'moderate';
  return 'high';
}

// ── Hard flags ──────────────────────────────────────────────────────

export function evaluateHardFlags(
  module: QSModule,
  answers: QSAnswers,
): QSHardFlag | null {
  for (const hf of module.hardFlags) {
    if (hf.matches(answers)) return hf;
  }
  return null;
}

// ── Side-effect callouts ────────────────────────────────────────────

/**
 * Walks matrix questions whose sub-items declare cannotDoSideEffect — if any
 * row was rated 'Cannot do at all' and the sub-item is flagged, the side effect
 * is added to callouts. Currently supports 'driving-safety' (per Neck PRD).
 */
function computeCallouts(module: QSModule, answers: QSAnswers): string[] {
  const callouts: string[] = [];
  for (const q of visibleQuestions(module, answers)) {
    if (q.kind !== 'matrix-scored' || !q.subItems) continue;
    const m = asMatrix(answers[q.id]);
    for (const sub of q.subItems) {
      if (sub.cannotDoSideEffect && m[sub.id] === 'Cannot do at all') {
        if (sub.cannotDoSideEffect === 'driving-safety') {
          callouts.push(
            'Driving safety: difficulty turning your head while driving is a safety consideration. Please consult a clinician before long drives.',
          );
        }
      }
    }
  }
  return callouts;
}

// ── Public entrypoint ──────────────────────────────────────────────

/**
 * Run the full evaluation. Halt → halt result. Otherwise score, apply
 * hard flags, map tier, compute tags, return tier result.
 */
export function runQuickScan(module: QSModule, answers: QSAnswers): QSResult {
  // 1. Red-flag halt takes absolute precedence.
  const halt = evaluateHalt(module, answers);
  if (halt) return halt;

  // 2. Score & hard-flag.
  const { total, contributions } = scoreModule(module, answers);
  const hf = evaluateHardFlags(module, answers);
  const tierFromScore = mapTier(module, total);
  const tier: QSTier = hf ? 'high' : tierFromScore;

  if (hf) {
    contributions.push({
      questionId: '__hard_flag__',
      layer: 3,
      points: 0,
      source: `hard-flag:${hf.id}`,
    });
  }

  // 3. Condition tags.
  const tags = (module.conditionTags ?? [])
    .filter((r) => r.matches(answers))
    .map((r) => r.tag);

  const result: QSTierResult = {
    halted: false,
    moduleId: module.id,
    moduleDisplayName: module.displayName,
    tier,
    totalScore: total,
    contributions,
    hardFlagApplied: hf
      ? { id: hf.id, description: hf.description }
      : undefined,
    conditionTags: tags,
    routing: module.routing[tier],
    callouts: computeCallouts(module, answers),
    disclaimer: module.disclaimer,
    answers,
    deepScanRegion: module.deepScanRegion,
  };
  return result;
}

// Re-export the hard-flag type so consumers don't have to import twice.
export type { QSHardFlag } from './types';
