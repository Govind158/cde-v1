/**
 * Kriya QuickScan — Core Types
 *
 * QuickScan is a 2-3 minute risk-signal scan that complements the 10-15
 * minute DeepScan (DiagnosticsChat). It exists in two streams:
 *
 *   - by Location  : "Where does it hurt?"  → location module (e.g. low back)
 *   - by Condition : "I have / was told I have…"  → condition module (e.g. disc bulge)
 *
 * Architecture matches the inviolable three-layer rule from CLAUDE.md:
 *   Layer 1 (LLM)  — not used in QuickScan v1; everything is structured chips
 *   Layer 2 (CDE)  — this module: scoring, red-flag halt, tier, routing
 *   Layer 3 (LLM)  — not used in QuickScan v1; static templated copy
 *
 * Each module is a pure data spec consumed by a generic runner. Adding a new
 * module is just adding a new file under modules/ and registering it.
 *
 * PRD source: docs/Kriya Scan/{QuickScan by Location, QuickScan by Condition}/*
 */

import type { CSSProperties } from 'react';

// ── Risk tiers ──────────────────────────────────────────────────────
export type QSTier = 'low' | 'moderate' | 'high';
export type QSHaltKind = 'emergency' | 'urgent';

// ── Answers payload ─────────────────────────────────────────────────
/**
 * Generic answer store. Keys are question ids ('Q1.1' etc.). Values:
 *   - single-scored / multi-halt-single  → string (option label)
 *   - multi-scored                       → string[] (option labels)
 *   - matrix-scored                      → Record<subItem, string> (rating per row)
 *
 * The runner never inspects values structurally — only the engine and the
 * question-level predicates do. Keys are namespaced per module so no two
 * modules collide if a future feature lets users complete several scans.
 */
export type QSAnswerValue = string | string[] | Record<string, string>;
export type QSAnswers = Record<string, QSAnswerValue>;

// ── Question building blocks ────────────────────────────────────────
export interface QSOption {
  /** Verbatim chip label shown to the user. */
  label: string;
  /** Points contributed if selected (0 for non-scored binary halts). */
  points: number;
  /** Optional short clinical note shown to the user inline (rare; usually omitted). */
  helper?: string;
}

export type QSMatrixRating = 'Not at all' | 'A little' | 'Quite a bit' | 'Cannot do at all';

export interface QSMatrixSubItem {
  /** Unique key within this matrix question. */
  id: string;
  /** Sub-item prompt (e.g. "Sitting for more than 30 minutes"). */
  label: string;
  /** Optional flag: a 'Cannot do at all' on this row → side-effect like driving safety callout. */
  cannotDoSideEffect?: 'driving-safety';
}

export type QSQuestionKind =
  | 'multi-halt'    // Layer 0: multi-select; halts on any non-"None" selection
  | 'single-scored' // Layer 1-3: pick one chip with points
  | 'multi-scored'  // Layer 1-3: pick up to N chips, points sum
  | 'matrix-scored';// Layer 2 ADL: each sub-item rated 0-3

export interface QSQuestion {
  /** PRD identifier — used for analytics, conditional showWhen, audit. */
  id: string;
  /** Layer index (0 = red flag, 1 = symptom, 2 = function, 3 = modifier). */
  layer: 0 | 1 | 2 | 3;
  kind: QSQuestionKind;
  /** Verbatim user-facing prompt. */
  prompt: string;
  /** Optional brief helper text shown under the prompt. */
  helper?: string;
  /** Source instrument citation surfaced in 'Why this is credible' footer. */
  source: string;

  // ── Per-kind fields ──
  options?: QSOption[];          // single/multi-scored, multi-halt
  /** For multi-scored: max selections allowed (e.g. "Select up to 2"). */
  maxSelect?: number;
  /** For multi-halt: rating-rule (which selections halt; usually all except 'None of the above'). */
  haltLabel?: 'None of the above' | string;
  /** For multi-halt: severity of the halt screen if any non-haltLabel option is picked. */
  haltKind?: QSHaltKind;
  /** For multi-halt: per-option halt-kind override. */
  optionHaltKind?: Record<string, QSHaltKind>;

  // ── Matrix ──
  subItems?: QSMatrixSubItem[];
  /** Sub-score threshold above which a +N modifier kicks in. */
  matrixSubScoreThreshold?: { min: number; bonusPoints: number };

  // ── Conditional show ──
  /** Predicate: only show this question when answers satisfy this condition. */
  showWhen?: (a: QSAnswers) => boolean;
}

// ── Hard flags ──────────────────────────────────────────────────────
/**
 * Hard flag: a clinical pattern that promotes the user to HIGH RISK
 * regardless of numeric score. Applied AFTER scoring, BEFORE tier mapping.
 */
export interface QSHardFlag {
  id: string;
  /** Human-readable rule for clinician audit logs. */
  description: string;
  matches: (a: QSAnswers) => boolean;
}

// ── Routing per tier ────────────────────────────────────────────────
export interface QSCTAStub {
  label: string;
  destination: 'kriya-play' | 'kriya-care' | 'myo-ai';
  /** Sub-target hint, e.g. "muscle-mood" or "walk-more". */
  subProgram?: string;
}

export interface QSRouting {
  /** One-line clinical interpretation shown on the result card. */
  interpretation: string;
  /** Primary CTA: typically a Kriya Play / Kriya Care entry point. */
  primaryCTA: QSCTAStub;
  /** Secondary CTA — educational content / DeepScan invite. */
  secondaryCTA?: QSCTAStub;
  /** Tertiary CTA — DeepScan invite for moderate; clinical referral for high. */
  tertiaryCTA?: QSCTAStub | { label: string; destination: 'deepscan' | 'specialist' };
  /** If true, the DeepScan prompt is rendered as a banner the user must dismiss. */
  mandatoryDeepScanPrompt?: boolean;
  /** Educational tip shown beneath the CTA stack. */
  tip?: string;
}

// ── Condition tags ──────────────────────────────────────────────────
/**
 * Tags computed from answers. Drives output personalisation (e.g. "Tech Neck",
 * "Sciatica signal"). Tags surface as small chips beneath the result; they are
 * NOT diagnoses.
 */
export interface QSConditionTagRule {
  tag: string;
  matches: (a: QSAnswers) => boolean;
}

// ── Module spec ─────────────────────────────────────────────────────
/**
 * A QuickScan module. Encodes one PRD verbatim. The runner walks `questions`
 * in order, skipping any whose `showWhen` returns false, halting on a positive
 * Layer-0 multi-halt, scoring everything else, applying hard flags, mapping
 * to a tier, and rendering the matched routing block.
 */
export interface QSModule {
  id: string;                      // 'low-back' | 'knee' | …
  kind: 'location' | 'condition';
  /** User-facing name on cards & headers. */
  displayName: string;
  /** Region key matching DiagnosticsChat L030201 options — used for DeepScan handoff. */
  deepScanRegion?: string;
  /** One-line tile description on the picker. */
  shortDescription: string;
  /** Estimated minutes to complete. */
  estimatedMinutes: number;
  /** Instruments cited (NDI, ODI, NICE NG59 …). */
  instruments: string[];
  /** Mandatory disclaimer (verbatim from PRD §2.2). */
  disclaimer: string;
  /** Welcome bubble lines shown before Q0.1. */
  intro: string[];
  /** All questions, in canonical order. Layer 0 first, then 1, 2, 3. */
  questions: QSQuestion[];
  /** Tier thresholds: [low.min, low.max, mod.max] — high = mod.max + 1 onwards. */
  tiers: { lowMax: number; moderateMax: number };
  /** Hard-flag rules — each one promotes to HIGH if matched. */
  hardFlags: QSHardFlag[];
  /** Routing per tier. */
  routing: Record<QSTier, QSRouting>;
  /** Tag rules. */
  conditionTags?: QSConditionTagRule[];
  /** Visual accent (matches kriya-ui-design tokens). */
  accent?: string;
}

// ── Result shape ────────────────────────────────────────────────────
export interface QSScoreContribution {
  questionId: string;
  layer: number;
  points: number;
  /** Origin: 'option', 'matrix', 'sub-score-bonus', 'hard-flag'. */
  source: string;
}

export interface QSHaltResult {
  halted: true;
  haltKind: QSHaltKind;
  triggerQuestionId: string;
  triggerOptions: string[];
  /** Verbatim screen heading and body lines. */
  heading: string;
  body: string[];
  helplineCTAs: { label: string; type: 'call' | 'navigate' }[];
  disclaimer: string;
  moduleId: string;
}

export interface QSTierResult {
  halted: false;
  moduleId: string;
  moduleDisplayName: string;
  tier: QSTier;
  totalScore: number;
  contributions: QSScoreContribution[];
  hardFlagApplied?: { id: string; description: string };
  conditionTags: string[];
  routing: QSRouting;
  /** Side-effect callouts (e.g. driving-safety, footwear). */
  callouts: string[];
  disclaimer: string;
  /** Raw answers — preserved for audit / DeepScan handoff. */
  answers: QSAnswers;
  /** Region id for DeepScan handoff (if applicable). */
  deepScanRegion?: string;
}

export type QSResult = QSHaltResult | QSTierResult;

// ── Style helper ────────────────────────────────────────────────────
export interface QSChipStyle {
  border: string;
  bg: string;
  color: string;
  fontWeight: CSSProperties['fontWeight'];
}
