/**
 * Kriya Pain Diagnostics — Chat Transcript
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
import { GC, Btn, Chip, Lbl } from './primitives';
import { severityColor, flagColor, flagLabel } from './scoring';
import type { ChatEntry, DiagnosticResult, NoPainResult } from './types';

interface Props {
  entries: ChatEntry[];
  typing: boolean;
  /** Invoked when the user confirms an extraction-summary card. */
  onConfirmExtraction?: (entryId: string) => void;
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
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [entries.length, typing]);

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
        <ChatBubble
          key={e.id}
          entry={e}
          onConfirmExtraction={onConfirmExtraction}
          onEditExtraction={onEditExtraction}
          onChipsAnswer={onChipsAnswer}
          onChipsAnswerMulti={onChipsAnswerMulti}
        />
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
  onConfirmExtraction?: (id: string) => void;
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
    const resolved = entry.resolved;
    return (
      <div style={{ alignSelf: 'flex-start', maxWidth: '95%' }}>
        <GC v="glow" style={{ padding: 16 }}>
          <Lbl>🧠 Captured from your description</Lbl>
          {entry.labels.length === 0 ? (
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, lineHeight: 1.55 }}>
              I couldn&apos;t confidently pull any structured answers from that — could you try the options above or rephrase?
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
              {entry.labels.map((l) => (
                <div
                  key={l.key}
                  style={{ fontSize: 13, color: '#f8fafc', lineHeight: 1.5 }}
                >
                  • {l.label}
                </div>
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
          ) : entry.labels.length > 0 ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Chip
                label="✓ Confirm"
                sel
                color="#22c55e"
                onClick={() => onConfirmExtraction?.(entry.id)}
              />
              <Chip
                label="✎ Edit / Redo"
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

  if (entry.kind === 'result') {
    return <ResultCard result={entry.result} />;
  }

  return null;
}

function ResultCard({ result }: { result: DiagnosticResult | NoPainResult }) {
  if ('noPain' in result && result.noPain) {
    return (
      <div style={{ alignSelf: 'flex-start', maxWidth: '95%' }}>
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
        </GC>
      </div>
    );
  }

  const r = result as DiagnosticResult;
  const sv = r.severity;
  const sevCol = severityColor(sv.bucket);
  const maxS = Math.max(...Object.values(r.scores), 1);
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
      <GC v="glow" style={{ padding: 16 }}>
        <Lbl>Diagnostic Results</Lbl>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <GC style={{ padding: '12px 14px', border: `1px solid ${sevCol}33` }}>
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
                fontSize: 22,
                fontWeight: 800,
                color: sevCol,
                lineHeight: 1.1,
                marginTop: 2,
              }}
            >
              {sv.bucket}
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{sv.total} pts</div>
          </GC>
          <GC style={{ padding: '12px 14px', border: '1px solid rgba(20,184,166,0.30)' }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: '#14b8a6',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
              }}
            >
              Confidence
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: '#14b8a6',
                lineHeight: 1.1,
                marginTop: 2,
              }}
            >
              {r.confidence}
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Rank-gap</div>
          </GC>
        </div>
      </GC>

      <GC style={{ padding: 16 }}>
        <Lbl>Top 3 Probable Conditions</Lbl>
        {r.top_3.map((c, i) => {
          const pBar = (c.score / maxS) * 100;
          const col = rankCols[i] ?? '#3b82f6';
          return (
            <div
              key={c.name}
              style={{
                padding: '10px 0',
                borderTop: i ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
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
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: col,
                    minWidth: 28,
                    textAlign: 'right',
                  }}
                >
                  {c.score}
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  borderRadius: 99,
                  background: 'rgba(255,255,255,0.06)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${pBar}%`,
                    borderRadius: 99,
                    background: col,
                    boxShadow: `0 0 8px ${col}66`,
                    transition: 'width 800ms',
                  }}
                />
              </div>
            </div>
          );
        })}
      </GC>

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
