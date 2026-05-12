/**
 * Kriya CDE — DeepScan Chat Transcript
 *
 * Renders the scrolling message list. Bot messages are left-aligned glass bubbles;
 * the user's selections render as right-aligned pills.
 * Insight / severity / BMI / mini-diagnosis / result cards are inline bot messages too.
 *
 * Design tokens: Kriya.care dark glassmorphism (see kriya-ui-design skill).
 *   primary text   #f8fafc
 *   secondary text #94a3b8
 *   muted text     #64748b
 *   accent (brand) #3b82f6
 *   success        #22c55e
 *   warning        #f59e0b
 *   danger         #ef4444
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { GC, Btn, Chip, Lbl, KI } from './primitives';
import { severityColor, flagColor, flagLabel } from './scoring';
import { statsForTop3, type ConditionStat } from './condition-stats';
import type { ChatEntry, DiagnosticResult, NoPainResult, PatientData } from './types';
import { EXTRACT_FIELDS, type ExtractField } from '@/lib/extract-schema';

interface Props {
  entries: ChatEntry[];
  typing: boolean;
  /**
   * Invoked when the user confirms an extraction-summary card.  The card now
   * renders editable controls per extracted field so the user may adjust the
   * LLM's suggestions before confirming; the (possibly edited) patches are
   * passed back via the second argument.  When undefined the orchestrator
   * should fall back to the entry's original patches.
   */
  onConfirmExtraction?: (
    entryId: string,
    editedPatches?: Partial<PatientData> & { height?: string; weight?: string },
  ) => void;
  /** Invoked when the user rejects an extraction-summary card. */
  onEditExtraction?: (entryId: string) => void;
  /** Invoked when the user taps a chip on a single-select chips-question bubble. */
  onChipsAnswer?: (entryId: string, value: string) => void;
  /** Invoked when the user taps Send on a multi-select chips-question bubble. */
  onChipsAnswerMulti?: (entryId: string, values: string[]) => void;
}

export function ChatTranscript({
  entries,
  typing,
  onConfirmExtraction,
  onEditExtraction,
  onChipsAnswer,
  onChipsAnswerMulti,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // When the most recently appended entry is the final result card, scroll
    // its TOP into view rather than jumping to the bottom of the transcript.
    // Otherwise the disclaimer / open items would sit at the viewport bottom
    // and the user would have to scroll up to see the severity tile and the
    // top-3 condition list — the primary takeaways.
    const last = entries[entries.length - 1];
    if (last && last.role === 'bot' && last.kind === 'result') {
      const target = el.querySelector<HTMLDivElement>(
        `[data-entry-id="${last.id}"]`,
      );
      if (target) {
        // Compute the offset of the result entry relative to the scroll
        // container and scroll smoothly to that position (top-aligned).
        const top = target.offsetTop - el.offsetTop;
        el.scrollTo({ top, behavior: 'smooth' });
        return;
      }
    }
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [entries, typing]);

  return (
    <div
      ref={scrollRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 16px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        scrollbarWidth: 'thin',
      }}
    >
      {entries.map((e) => (
        // Wrapper preserves each bubble's alignSelf (user bubbles right-aligned,
        // bot bubbles left-aligned) by re-creating the flex-column context.
        // The data attribute lets the scroll effect target the result card.
        <div
          key={e.id}
          data-entry-id={e.id}
          data-entry-kind={e.kind}
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          <ChatBubble
            entry={e}
            onConfirmExtraction={onConfirmExtraction}
            onEditExtraction={onEditExtraction}
            onChipsAnswer={onChipsAnswer}
            onChipsAnswerMulti={onChipsAnswerMulti}
          />
        </div>
      ))}
      {typing && <TypingDots />}
    </div>
  );
}

function ChatBubble({
  entry,
  onConfirmExtraction,
  onEditExtraction,
  onChipsAnswer,
  onChipsAnswerMulti,
}: {
  entry: ChatEntry;
  onConfirmExtraction?: (
    id: string,
    editedPatches?: Partial<PatientData> & { height?: string; weight?: string },
  ) => void;
  onEditExtraction?: (id: string) => void;
  onChipsAnswer?: (id: string, value: string) => void;
  onChipsAnswerMulti?: (id: string, values: string[]) => void;
}) {
  if (entry.role === 'user') {
    return (
      <div style={{ alignSelf: 'flex-end', maxWidth: '85%' }}>
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '16px 16px 4px 16px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#f8fafc',
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 1.45,
            boxShadow: '0 4px 16px rgba(59,130,246,0.22), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
        >
          {entry.text}
        </div>
      </div>
    );
  }

  // Bot bubbles
  if (entry.kind === 'text') {
    return (
      <div style={{ alignSelf: 'flex-start', maxWidth: '90%' }}>
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '16px 16px 16px 4px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
            color: '#f8fafc',
            fontSize: 13,
            lineHeight: 1.55,
          }}
        >
          {entry.text}
        </div>
      </div>
    );
  }

  if (entry.kind === 'insight') {
    return (
      <div style={{ alignSelf: 'flex-start', maxWidth: '90%' }}>
        <GC
          style={{
            padding: '12px 16px',
            background: `${entry.color}14`,
            border: `1px solid ${entry.color}33`,
          }}
        >
          <p style={{ fontSize: 12, color: entry.color, margin: 0, lineHeight: 1.55, fontWeight: 500 }}>
            {entry.emoji} {entry.text}
          </p>
        </GC>
      </div>
    );
  }

  if (entry.kind === 'bmi') {
    const { insight: bi, bmi } = entry;
    return (
      <div style={{ alignSelf: 'flex-start', maxWidth: '90%' }}>
        <GC v="elevated" style={{ padding: '14px 16px', border: `1px solid ${bi.c}33` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 22 }}>{bi.e}</span>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: bi.c,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                }}
              >
                {bi.t}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc', lineHeight: 1.1 }}>
                BMI {bmi}
              </div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.55 }}>{bi.m}</p>
        </GC>
      </div>
    );
  }

  if (entry.kind === 'mini-diagnosis') {
    const { insight } = entry;
    return (
      <div style={{ alignSelf: 'flex-start', maxWidth: '90%' }}>
        <GC
          style={{
            padding: '12px 16px',
            border: `1px solid ${insight.c}33`,
            background: `${insight.c}10`,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: insight.c,
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
            }}
          >
            🩺 Mini-Diagnosis · {insight.t}
          </div>
          {insight.items.map((it, i) => (
            <div
              key={i}
              style={{
                fontSize: 12,
                color: '#94a3b8',
                lineHeight: 1.55,
                paddingLeft: 4,
              }}
            >
              • {it}
            </div>
          ))}
        </GC>
      </div>
    );
  }

  if (entry.kind === 'severity') {
    const { severity: sv } = entry;
    const col = severityColor(sv.bucket);
    return (
      <div style={{ alignSelf: 'flex-start', maxWidth: '90%' }}>
        <GC
          style={{
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            border: `1px solid ${col}33`,
          }}
        >
          <div style={{ position: 'relative', width: 36, height: 36 }}>
            <svg viewBox="0 0 36 36" style={{ width: 36, height: 36, transform: 'rotate(-90deg)' }}>
              <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke={col}
                strokeWidth="4"
                strokeDasharray={88}
                strokeDashoffset={88 - (88 * Math.min(sv.total, 14)) / 14}
                strokeLinecap="round"
                style={{ transition: 'all 500ms' }}
              />
            </svg>
            <span
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 800,
                color: col,
              }}
            >
              {sv.total}
            </span>
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: col,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
              }}
            >
              Live Severity
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>{sv.bucket}</div>
          </div>
          <div
            style={{
              marginLeft: 'auto',
              fontSize: 10,
              color: '#64748b',
              textAlign: 'right',
              maxWidth: 110,
              lineHeight: 1.35,
            }}
          >
            Updates live — not final
          </div>
        </GC>
      </div>
    );
  }

  if (entry.kind === 'red-flag') {
    return (
      <div style={{ alignSelf: 'flex-start', maxWidth: '90%' }}>
        <GC v="pain" style={{ padding: '12px 16px' }}>
          <p style={{ fontSize: 12, color: '#fca5a5', margin: 0, fontWeight: 700, lineHeight: 1.5 }}>
            🚨 {entry.text}
          </p>
        </GC>
      </div>
    );
  }

  if (entry.kind === 'thinking') {
    return (
      <div style={{ alignSelf: 'flex-start', maxWidth: '90%' }}>
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '16px 16px 16px 4px',
            background: 'rgba(59,130,246,0.08)',
            border: '1px dashed rgba(59,130,246,0.30)',
            color: '#93c5fd',
            fontSize: 12,
            lineHeight: 1.45,
            fontStyle: 'italic',
          }}
        >
          {entry.text}
        </div>
      </div>
    );
  }

  if (entry.kind === 'chips-question') {
    return (
      <ChipsQuestionBubble
        entry={entry}
        onChipsAnswer={onChipsAnswer}
        onChipsAnswerMulti={onChipsAnswerMulti}
      />
    );
  }

  if (entry.kind === 'extraction-summary') {
    return (
      <ExtractionSummaryBubble
        entry={entry}
        onConfirmExtraction={onConfirmExtraction}
        onEditExtraction={onEditExtraction}
      />
    );
  }

  if (entry.kind === 'result') {
    return <ResultCard result={entry.result} />;
  }

  return null;
}

function ResultCard({ result }: { result: DiagnosticResult | NoPainResult }) {
  if ('noPain' in result && result.noPain) {
    return (
      <div style={{ alignSelf: 'flex-start', maxWidth: '95%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <GC v="glow" style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>✅</div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: '#f8fafc',
              margin: '0 0 10px',
              letterSpacing: '-0.01em',
            }}
          >
            No Active Pain Detected
          </h2>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, lineHeight: 1.55 }}>
            {result.action}
          </p>
          <p
            style={{
              fontSize: 11,
              color: 'rgba(134,239,172,0.9)',
              margin: '14px 0 0',
              lineHeight: 1.5,
              borderTop: '1px solid rgba(255,255,255,0.06)',
              paddingTop: 10,
            }}
          >
            <strong>Disclaimer:</strong> {result.disclaimer}
          </p>
        </GC>
      </div>
    );
  }

  const r = result as DiagnosticResult;
  const sv = r.severity;
  const sevCol = severityColor(sv.bucket);
  // Probabilistic score numbers (per-condition and the severity points total)
  // are no longer surfaced to users — they don't carry meaning outside of the
  // internal engine.  We still colour the rank pill so 1/2/3 read as a ladder.
  const rankCols = ['#3b82f6', '#22d3ee', '#a855f7'];

  return (
    <div
      style={{
        alignSelf: 'flex-start',
        maxWidth: '95%',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/*
        URGENT contradiction banner removed (2026-05). Soft contradictions are
        now surfaced as inline conversational notes at the moment of selection
        (see DiagnosticsChat.commit). The L-coded audit text still lives on
        result.gates.contradictions for the clinician audit log. Emergency /
        urgent banners triggered by *other* gates (e.g. cauda equina) are not
        affected — those still come through scoring.ts as result.banner, but
        the soft-contradiction path can no longer set one.
      */}
      {r.banner ? (
        <GC
          style={{
            padding: '14px 16px',
            background: 'rgba(239,68,68,0.10)',
            border: '2px solid rgba(239,68,68,0.55)',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#ef4444',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              marginBottom: 6,
            }}
          >
            🚨 {r.banner.tone === 'emergency' ? 'Emergency — seek care now' : 'Urgent'}
          </div>
          <div style={{ fontSize: 13, color: '#fecaca', lineHeight: 1.55, fontWeight: 600 }}>
            {r.banner.text}
          </div>
        </GC>
      ) : null}
      {/*
        Confidence tile removed (2026-05). It was not actionable for the user
        and 'Low' / 'Rank-gap' was confusing. The internal confidence value is
        still computed in scoring.ts and persisted on r.confidence for the
        audit log and any future clinician-facing surface.
      */}
      <GC v="glow" style={{ padding: 16 }}>
        <Lbl>Pain Risk Assessment</Lbl>
        <GC style={{ padding: '14px 16px', border: `1px solid ${sevCol}33` }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: sevCol,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
            }}
          >
            Severity
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: sevCol,
              lineHeight: 1.1,
              marginTop: 4,
            }}
          >
            {sv.bucket}
          </div>
        </GC>
      </GC>

      <GC style={{ padding: 16 }}>
        <Lbl>Top 3 Probable Conditions</Lbl>
        {r.top_3.map((c, i) => {
          const col = rankCols[i] ?? '#3b82f6';
          return (
            <div
              key={c.name}
              style={{
                padding: '10px 0',
                borderTop: i ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    background: `${col}22`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 800,
                    color: col,
                  }}
                >
                  {i + 1}
                </div>
                <div
                  style={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#f8fafc',
                    lineHeight: 1.3,
                  }}
                >
                  {c.name}
                </div>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 99,
                    fontSize: 9,
                    fontWeight: 700,
                    background: `${flagColor(c.flag)}22`,
                    color: flagColor(c.flag),
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  {flagLabel(c.flag)}
                </span>
              </div>
            </div>
          );
        })}
      </GC>

      <PopulationContextCard result={r} />

      <GC style={{ padding: '14px 16px', border: '1px solid rgba(34,211,238,0.25)' }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#22d3ee',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: 6,
          }}
        >
          Recommended Action
        </div>
        <div style={{ fontSize: 13, color: '#f8fafc', lineHeight: 1.55 }}>{r.action}</div>
      </GC>

      <GC
        style={{
          padding: '10px 14px',
          background: 'rgba(34,197,94,0.06)',
          border: '1px solid rgba(34,197,94,0.18)',
        }}
      >
        <p style={{ fontSize: 11, color: 'rgba(134,239,172,0.9)', margin: 0, lineHeight: 1.55 }}>
          <strong>Disclaimer:</strong> {r.disclaimer}
        </p>
      </GC>
    </div>
  );
}

/**
 * Population Context card — renders a peer-reviewed prevalence/burden stat
 * for each of the user's top-3 conditions, filtered by age/gender. Sourced
 * from condition-stats.ts. Renders NOTHING when no condition in the top-3
 * has a matching stat (no fabrication — see condition-stats.ts header rule).
 *
 * Per the user direction (2026-05): placed immediately after the Top 3
 * Probable Conditions card and before the Recommended Action card.
 */
function PopulationContextCard({ result }: { result: DiagnosticResult }) {
  const names = result.top_3.map((c) => c.name);
  const stats = statsForTop3(names, result.user);
  // Pair each condition with its (possibly null) stat; filter to those that
  // actually have one. If nothing matches, render nothing.
  const rows: { name: string; stat: ConditionStat }[] = [];
  for (let i = 0; i < names.length; i += 1) {
    const s = stats[i];
    if (s) rows.push({ name: names[i], stat: s });
  }
  if (rows.length === 0) return null;
  return (
    <GC
      style={{
        padding: '14px 16px',
        border: '1px solid rgba(168,85,247,0.25)',
        background: 'rgba(168,85,247,0.05)',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#c4b5fd',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          marginBottom: 10,
        }}
      >
        You’re not alone — what the research says
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map((row, i) => (
          <div
            key={row.name}
            style={{
              paddingTop: i ? 10 : 0,
              borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#a78bfa',
                marginBottom: 4,
                letterSpacing: '0.04em',
              }}
            >
              {row.name}
            </div>
            <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.6 }}>
              {row.stat.text}
            </div>
            <a
              href={row.stat.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                marginTop: 6,
                fontSize: 10,
                color: '#94a3b8',
                textDecoration: 'underline',
                lineHeight: 1.4,
              }}
            >
              Source: {row.stat.source} ↗
            </a>
          </div>
        ))}
      </div>
    </GC>
  );
}

function ChipsQuestionBubble({
  entry,
  onChipsAnswer,
  onChipsAnswerMulti,
}: {
  entry: Extract<ChatEntry, { kind: 'chips-question' }>;
  onChipsAnswer?: (id: string, value: string) => void;
  onChipsAnswerMulti?: (id: string, values: string[]) => void;
}) {
  const [local, setLocal] = useState<string[]>([]);
  const resolved = entry.resolved;
  const isResolved = resolved !== undefined;

  const toggle = (o: string) => {
    if (isResolved) return;
    if (o === 'None') {
      setLocal(['None']);
      return;
    }
    setLocal((prev) => {
      const withoutNone = prev.filter((x) => x !== 'None');
      return withoutNone.includes(o) ? withoutNone.filter((x) => x !== o) : [...withoutNone, o];
    });
  };

  const isSelected = (o: string): boolean => {
    if (isResolved) {
      return Array.isArray(resolved) ? resolved.includes(o) : resolved === o;
    }
    return local.includes(o);
  };

  const accent = entry.multi ? '#f59e0b' : '#14b8a6';

  return (
    <div style={{ alignSelf: 'flex-start', maxWidth: '95%' }}>
      <GC v="glow" style={{ padding: '14px 16px' }}>
        {entry.prompt && <Lbl color={accent}>{entry.prompt}</Lbl>}
        {entry.multi && !isResolved && (
          <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 10px', lineHeight: 1.45 }}>
            Mark all that apply — tap Send when done
          </p>
        )}
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            marginBottom: entry.multi && !isResolved ? 12 : 0,
          }}
        >
          {entry.options.map((o) => (
            <Chip
              key={o}
              label={o}
              sel={isSelected(o)}
              color={accent}
              disabled={isResolved}
              onClick={() => {
                if (isResolved) return;
                if (entry.multi) {
                  toggle(o);
                } else {
                  onChipsAnswer?.(entry.id, o);
                }
              }}
            />
          ))}
        </div>
        {entry.multi && !isResolved && (
          <Btn disabled={local.length === 0} onClick={() => onChipsAnswerMulti?.(entry.id, local)}>
            Send →
          </Btn>
        )}
      </GC>
    </div>
  );
}

/**
 * Editable extraction-summary bubble.
 *
 * Renders the LLM's extracted patches as editable controls keyed by each
 * field's `ExtractField` metadata in `lib/extract-schema.ts`:
 *   - enum         → single-select chips
 *   - enum-multi   → multi-select chips
 *   - number       → numeric KI input
 *   - range-1-10   → 1-10 slider
 *   - text         → text KI input
 *   - (height/weight aliases use the number control)
 *
 * The user can adjust any field before pressing Confirm.  On confirm we
 * call `onConfirmExtraction(entryId, editedPatches)` — the orchestrator
 * applies these edited patches (not the original LLM patches) to PatientData.
 */
function ExtractionSummaryBubble({
  entry,
  onConfirmExtraction,
  onEditExtraction,
}: {
  entry: Extract<ChatEntry, { kind: 'extraction-summary' }>;
  onConfirmExtraction?: (
    id: string,
    editedPatches?: Partial<PatientData> & { height?: string; weight?: string },
  ) => void;
  onEditExtraction?: (id: string) => void;
}) {
  const resolved = entry.resolved;
  const isResolved = resolved !== undefined;

  // ── Resolve each extracted key to its ExtractField metadata ──
  const editableFields: { key: string; field: ExtractField | undefined; label: string }[] =
    entry.labels.map((l) => ({
      key: l.key,
      label: l.label,
      field: EXTRACT_FIELDS.find((f) => f.key === l.key),
    }));

  // ── Local edit buffer keyed by QC field ──
  const initialEdits: Record<string, unknown> = {};
  for (const { key } of editableFields) {
    const v = (entry.patches as Record<string, unknown>)[key];
    if (v !== undefined) initialEdits[key] = v;
  }
  const [edits, setEdits] = useState<Record<string, unknown>>(initialEdits);

  const setValue = (key: string, value: unknown) => {
    setEdits((prev) => ({ ...prev, [key]: value }));
  };

  // ── Build edited patches when the user confirms ──
  const buildEditedPatches = (): Partial<PatientData> & { height?: string; weight?: string } => {
    const out: Record<string, unknown> = {};
    for (const { key } of editableFields) {
      const v = edits[key];
      if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) continue;
      out[key] = v;
    }
    return out as Partial<PatientData> & { height?: string; weight?: string };
  };

  return (
    <div style={{ alignSelf: 'flex-start', maxWidth: '95%' }}>
      <GC v="glow" style={{ padding: 16 }}>
        <Lbl>🧠 Captured from your description</Lbl>
        {editableFields.length === 0 ? (
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, lineHeight: 1.55 }}>
            I couldn&apos;t confidently pull any structured answers from that — could you try the options above or rephrase?
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 12 }}>
            <p
              style={{
                fontSize: 11,
                color: '#94a3b8',
                margin: 0,
                lineHeight: 1.55,
              }}
            >
              Review what I picked up — tap any chip or value below to adjust before confirming.
            </p>
            {editableFields.map(({ key, field, label }) => (
              <ExtractionFieldEditor
                key={key}
                qcKey={key}
                fieldLabel={field?.label ?? label}
                field={field}
                value={edits[key]}
                disabled={isResolved}
                onChange={(v) => setValue(key, v)}
              />
            ))}
          </div>
        )}
        {entry.notes && (
          <p
            style={{
              fontSize: 11,
              color: '#64748b',
              margin: '4px 0 12px',
              fontStyle: 'italic',
              lineHeight: 1.45,
            }}
          >
            {entry.notes}
          </p>
        )}
        {resolved ? (
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: resolved === 'confirmed' ? '#22c55e' : '#f59e0b',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
            }}
          >
            {resolved === 'confirmed' ? '✓ Confirmed' : '✎ Editing'}
          </div>
        ) : editableFields.length > 0 ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Chip
              label="✓ Confirm"
              sel
              color="#22c55e"
              onClick={() => onConfirmExtraction?.(entry.id, buildEditedPatches())}
            />
            <Chip
              label="✎ Discard / Use chips"
              sel={false}
              onClick={() => onEditExtraction?.(entry.id)}
            />
          </div>
        ) : (
          <Btn onClick={() => onEditExtraction?.(entry.id)}>Continue with options</Btn>
        )}
      </GC>
    </div>
  );
}

/**
 * Per-field editor used inside the extraction-summary bubble.  Picks the
 * appropriate control based on the field's declared `kind` in the extraction
 * schema.  Falls back to a free text input when the LLM produced a field we
 * have no metadata for (e.g. legacy `height` / `weight` aliases).
 */
function ExtractionFieldEditor({
  qcKey,
  fieldLabel,
  field,
  value,
  disabled,
  onChange,
}: {
  qcKey: string;
  fieldLabel: string;
  field: ExtractField | undefined;
  value: unknown;
  disabled: boolean;
  onChange: (next: unknown) => void;
}) {
  const labelHeader = (
    <Lbl color="#94a3b8">
      {fieldLabel}
    </Lbl>
  );

  // ── enum (single) ──
  if (field?.kind === 'enum' && field.enum) {
    const current = typeof value === 'string' ? value : '';
    return (
      <div>
        {labelHeader}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {field.enum.map((opt) => (
            <Chip
              key={opt}
              label={opt}
              sel={current === opt}
              disabled={disabled}
              onClick={() => onChange(opt)}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── enum-multi ──
  if (field?.kind === 'enum-multi' && field.enum) {
    const arr: string[] = Array.isArray(value) ? (value as string[]) : [];
    const toggle = (opt: string) => {
      if (disabled) return;
      if (opt === 'None' || opt === 'No surgeries reported' || opt === 'None of the above') {
        onChange(arr.includes(opt) ? [] : [opt]);
        return;
      }
      const withoutNone = arr.filter(
        (x) =>
          x !== 'None' && x !== 'No surgeries reported' && x !== 'None of the above',
      );
      onChange(
        withoutNone.includes(opt)
          ? withoutNone.filter((x) => x !== opt)
          : [...withoutNone, opt],
      );
    };
    return (
      <div>
        {labelHeader}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {field.enum.map((opt) => (
            <Chip
              key={opt}
              label={opt}
              sel={arr.includes(opt)}
              color="#f59e0b"
              disabled={disabled}
              onClick={() => toggle(opt)}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── range-1-10 ──
  if (field?.kind === 'range-1-10') {
    const num = typeof value === 'number' ? value : 5;
    const col = num >= 7 ? '#ef4444' : num >= 4 ? '#f59e0b' : '#22c55e';
    return (
      <div>
        {labelHeader}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="range"
            min={1}
            max={10}
            value={num}
            disabled={disabled}
            onChange={(e) => onChange(parseInt(e.target.value, 10))}
            style={{ flex: 1, accentColor: col }}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: col,
              minWidth: 36,
              textAlign: 'right',
            }}
          >
            {num}/10
          </span>
        </div>
      </div>
    );
  }

  // ── number / fallback aliases (height / weight) ──
  if (field?.kind === 'number' || qcKey === 'height' || qcKey === 'weight') {
    const str = typeof value === 'number' ? String(value) : (value as string | undefined) ?? '';
    return (
      <div>
        {labelHeader}
        <KI type="number" value={str} onChange={(v) => onChange(v)} placeholder="Enter a number" />
      </div>
    );
  }

  // ── text fallback ──
  const str = typeof value === 'string' ? value : value !== undefined ? String(value) : '';
  return (
    <div>
      {labelHeader}
      <KI type="text" value={str} onChange={(v) => onChange(v)} placeholder="Type a value" />
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ alignSelf: 'flex-start' }}>
      <div
        style={{
          padding: '12px 16px',
          borderRadius: '16px 16px 16px 4px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
          display: 'flex',
          gap: 5,
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#3b82f6',
              animation: `kriya-dot 1.2s infinite ${i * 0.15}s`,
            }}
          />
        ))}
      </div>
      <style>{`@keyframes kriya-dot { 0%,60%,100% { opacity: 0.3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-3px); } }`}</style>
    </div>
  );
}
