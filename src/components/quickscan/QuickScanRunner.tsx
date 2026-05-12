/**
 * Kriya QuickScan — Chat-style Runner
 *
 * Walks any QSModule as a conversational sequence. Mirrors the visual
 * language of DiagnosticsChat (glass cards, teal accent, bot/user bubbles)
 * so the user does not feel a hard mode-switch between QuickScan and DeepScan.
 *
 * Flow per question:
 *   1. Emit prompt + (optional) helper as bot bubble.
 *   2. Render input chips (single / multi / matrix).
 *   3. On submit: echo user choice, store in answers, evaluate red flag,
 *      advance to next visible question OR run the engine.
 *
 * Layer 0 multi-halt screens evaluate immediately on submit. If a halt
 * triggers, the runner short-circuits to QuickScanResult in halt mode.
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Btn, Chip, GC, Lbl } from '../diagnostics/primitives';
import { evaluateHalt, runQuickScan, visibleQuestions } from './engine';
import { QuickScanResult } from './QuickScanResult';
import type {
  QSAnswers,
  QSAnswerValue,
  QSMatrixRating,
  QSModule,
  QSQuestion,
  QSResult,
} from './types';

const MATRIX_RATINGS: QSMatrixRating[] = [
  'Not at all',
  'A little',
  'Quite a bit',
  'Cannot do at all',
];

const TYPING_DELAY = 380;
const BUBBLE_DELAY = 140;

interface Bubble {
  id: string;
  role: 'bot' | 'user';
  kind:
    | 'text'
    | 'helper'
    | 'question'
    | 'answer'
    | 'progress'
    | 'halt-warning';
  text?: string;
  question?: QSQuestion;
  /** For question bubbles: the answer once submitted. Renders the chip in 'resolved' state. */
  resolved?: QSAnswerValue;
}

interface RunnerState {
  answers: QSAnswers;
  bubbles: Bubble[];
  /** Index into visibleQuestions(module, answers) — recomputed each commit. */
  cursorId: string | null;
  typing: boolean;
  result: QSResult | null;
}

let bubbleCounter = 0;
const newBubbleId = (): string => {
  bubbleCounter += 1;
  return `qs-${bubbleCounter}`;
};

interface Props {
  module: QSModule;
  /** Called when the user taps Restart on the result card or the back chevron. */
  onExit: () => void;
  /** Called when the user taps the DeepScan CTA on the result card. */
  onLaunchDeepScan: (regionHint?: string) => void;
  /** Called when the user taps a Kriya Play / Care / Myo AI stub CTA. */
  onStubCTA?: (destination: string, label: string) => void;
}

export default function QuickScanRunner({
  module,
  onExit,
  onLaunchDeepScan,
  onStubCTA,
}: Props) {
  const [state, setState] = useState<RunnerState>({
    answers: {},
    bubbles: [],
    cursorId: null,
    typing: false,
    result: null,
  });
  const mounted = useRef(false);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  // ── Helpers ─────────────────────────────────────────────────────
  const wait = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const emitBubbles = useCallback(async (next: Bubble[]) => {
    for (const b of next) {
      if (b.role === 'bot') {
        setState((s) => ({ ...s, typing: true }));
        await wait(TYPING_DELAY);
        setState((s) => ({
          ...s,
          typing: false,
          bubbles: [...s.bubbles, b],
        }));
      } else {
        setState((s) => ({ ...s, bubbles: [...s.bubbles, b] }));
      }
      await wait(BUBBLE_DELAY);
    }
  }, []);

  // ── Question emitters ──────────────────────────────────────────
  const emitQuestion = useCallback(
    async (q: QSQuestion) => {
      const bubbles: Bubble[] = [
        { id: newBubbleId(), role: 'bot', kind: 'text', text: q.prompt },
      ];
      if (q.helper) {
        bubbles.push({
          id: newBubbleId(),
          role: 'bot',
          kind: 'helper',
          text: q.helper,
        });
      }
      bubbles.push({
        id: newBubbleId(),
        role: 'bot',
        kind: 'question',
        question: q,
      });
      await emitBubbles(bubbles);
    },
    [emitBubbles],
  );

  // ── Resolve next question ──────────────────────────────────────
  const findNextAfter = useCallback(
    (cursorId: string | null, answers: QSAnswers): QSQuestion | null => {
      const visible = visibleQuestions(module, answers);
      if (cursorId === null) return visible[0] ?? null;
      const idx = visible.findIndex((q) => q.id === cursorId);
      if (idx < 0) return null;
      return visible[idx + 1] ?? null;
    },
    [module],
  );

  // ── Commit an answer ───────────────────────────────────────────
  const commit = useCallback(
    async (q: QSQuestion, value: QSAnswerValue, displayLabel: string) => {
      // 1. Mark the question bubble as resolved + echo user bubble.
      setState((s) => ({
        ...s,
        bubbles: [
          ...s.bubbles.map((b) =>
            b.kind === 'question' && b.question?.id === q.id
              ? { ...b, resolved: value }
              : b,
          ),
          {
            id: newBubbleId(),
            role: 'user',
            kind: 'answer',
            text: displayLabel,
          },
        ],
        answers: { ...s.answers, [q.id]: value },
      }));

      // 2. Build new answers AFTER commit for halt + next-question evaluation.
      const updatedAnswers: QSAnswers = { ...state.answers, [q.id]: value };

      // 3. If this is a Layer-0 multi-halt and triggers a halt, short-circuit.
      if (q.layer === 0 && q.kind === 'multi-halt') {
        const halt = evaluateHalt(module, updatedAnswers);
        if (halt) {
          await emitBubbles([
            {
              id: newBubbleId(),
              role: 'bot',
              kind: 'halt-warning',
              text: 'Hold on — your responses include a signal that needs attention before we continue.',
            },
          ]);
          setState((s) => ({ ...s, result: halt }));
          return;
        }
      }

      // 4. Resolve next question or run engine.
      const next = findNextAfter(q.id, updatedAnswers);
      if (next) {
        setState((s) => ({ ...s, cursorId: next.id }));
        await emitQuestion(next);
        return;
      }

      // No more visible questions → run engine.
      await emitBubbles([
        {
          id: newBubbleId(),
          role: 'bot',
          kind: 'text',
          text: "All right — I'll process your responses. This takes a couple of seconds.",
        },
      ]);
      await wait(900);
      const out = runQuickScan(module, updatedAnswers);
      setState((s) => ({ ...s, result: out }));
    },
    [emitBubbles, emitQuestion, findNextAfter, module, state.answers],
  );

  // ── Initial mount: emit intro + first question ─────────────────
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    void (async () => {
      const intro: Bubble[] = module.intro.map((t) => ({
        id: newBubbleId(),
        role: 'bot',
        kind: 'text',
        text: t,
      }));
      await emitBubbles(intro);
      const first = visibleQuestions(module, {})[0];
      if (first) {
        setState((s) => ({ ...s, cursorId: first.id }));
        await emitQuestion(first);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-scroll on bubble append ───────────────────────────────
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.bubbles, state.typing, state.result]);

  // ── Progress (visible answered / visible total) ────────────────
  const progress = useMemo(() => {
    const total = visibleQuestions(module, state.answers).length;
    const answered = Object.keys(state.answers).length;
    return { answered, total };
  }, [module, state.answers]);

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: '100dvh',
        background:
          'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(20,184,166,0.12) 0%, transparent 60%), #020617',
        display: 'flex',
        justifyContent: 'center',
        padding: 8,
        boxSizing: 'border-box',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 24,
          boxShadow:
            '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100dvh - 16px)',
          maxHeight: 'calc(100dvh - 16px)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background:
              'linear-gradient(180deg, rgba(20,184,166,0.08) 0%, transparent 100%)',
          }}
        >
          <button
            type="button"
            onClick={onExit}
            aria-label="Back to chooser"
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#94a3b8',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            ← Back
          </button>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#14b8a6',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
              }}
            >
              QuickScan • {module.kind === 'location' ? 'Location' : 'Condition'}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#f8fafc',
                marginTop: 2,
              }}
            >
              {module.displayName}
            </div>
          </div>
          <div style={{ width: 64, textAlign: 'right' }}>
            {!state.result && progress.total > 0 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#64748b',
                  letterSpacing: '0.06em',
                }}
              >
                {progress.answered}/{progress.total}
              </span>
            )}
          </div>
        </div>

        {/* Transcript */}
        <div
          ref={transcriptRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 18px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {state.bubbles.map((b) => (
            <BubbleRow
              key={b.id}
              bubble={b}
              onSubmit={(q, value, label) => void commit(q, value, label)}
            />
          ))}
          {state.typing && <TypingIndicator />}
          {state.result && (
            <QuickScanResult
              result={state.result}
              onLaunchDeepScan={onLaunchDeepScan}
              onStubCTA={onStubCTA}
              onRestart={onExit}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Bubble renderer

interface BubbleProps {
  bubble: Bubble;
  onSubmit: (q: QSQuestion, value: QSAnswerValue, label: string) => void;
}

function BubbleRow({ bubble, onSubmit }: BubbleProps) {
  if (bubble.role === 'user' && bubble.kind === 'answer') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div
          style={{
            maxWidth: '80%',
            padding: '10px 14px',
            borderRadius: 16,
            background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
            color: '#f8fafc',
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1.45,
            boxShadow: '0 4px 12px rgba(20,184,166,0.25)',
          }}
        >
          {bubble.text}
        </div>
      </div>
    );
  }

  if (bubble.kind === 'text' || bubble.kind === 'halt-warning') {
    const tone = bubble.kind === 'halt-warning' ? '#f59e0b' : '#cbd5e1';
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <div
          style={{
            maxWidth: '90%',
            padding: '10px 14px',
            borderRadius: 16,
            background:
              bubble.kind === 'halt-warning'
                ? 'rgba(245, 158, 11, 0.12)'
                : 'rgba(255,255,255,0.05)',
            border:
              bubble.kind === 'halt-warning'
                ? '1px solid rgba(245, 158, 11, 0.3)'
                : '1px solid rgba(255,255,255,0.08)',
            color: tone,
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {bubble.text}
        </div>
      </div>
    );
  }

  if (bubble.kind === 'helper') {
    return (
      <div
        style={{
          fontSize: 12,
          color: '#64748b',
          paddingLeft: 4,
          fontStyle: 'italic',
        }}
      >
        {bubble.text}
      </div>
    );
  }

  if (bubble.kind === 'question' && bubble.question) {
    return (
      <QuestionInput
        question={bubble.question}
        resolved={bubble.resolved}
        onSubmit={(value, label) => onSubmit(bubble.question!, value, label)}
      />
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────
// Question input — renders chips matching the question kind

interface QuestionInputProps {
  question: QSQuestion;
  resolved?: QSAnswerValue;
  onSubmit: (value: QSAnswerValue, label: string) => void;
}

function QuestionInput({ question, resolved, onSubmit }: QuestionInputProps) {
  const isResolved = resolved !== undefined;

  // ── single-scored / single Q0.1 ──
  if (question.kind === 'single-scored') {
    return (
      <ChipsContainer>
        {(question.options ?? []).map((opt) => {
          const sel = isResolved && resolved === opt.label;
          return (
            <Chip
              key={opt.label}
              label={opt.label}
              sel={sel}
              disabled={isResolved}
              onClick={() => onSubmit(opt.label, opt.label)}
            />
          );
        })}
      </ChipsContainer>
    );
  }

  // ── multi-scored / multi-halt ──
  if (question.kind === 'multi-scored' || question.kind === 'multi-halt') {
    return (
      <MultiSelectChips
        question={question}
        resolved={resolved as string[] | undefined}
        onSubmit={onSubmit}
      />
    );
  }

  // ── matrix-scored ──
  if (question.kind === 'matrix-scored') {
    return (
      <MatrixInput
        question={question}
        resolved={resolved as Record<string, string> | undefined}
        onSubmit={onSubmit}
      />
    );
  }

  return null;
}

// Multi-select chips with a Send button. "None of the above" is exclusive.
function MultiSelectChips({
  question,
  resolved,
  onSubmit,
}: {
  question: QSQuestion;
  resolved?: string[];
  onSubmit: (value: string[], label: string) => void;
}) {
  const isResolved = resolved !== undefined;
  const exclusive = question.haltLabel ?? 'None of the above';
  const [picks, setPicks] = useState<string[]>(resolved ?? []);
  const max = question.maxSelect;

  const toggle = (label: string) => {
    if (isResolved) return;
    setPicks((prev) => {
      if (label === exclusive) return prev.includes(exclusive) ? [] : [exclusive];
      let next = prev.includes(label) ? prev.filter((p) => p !== label) : [...prev, label];
      next = next.filter((p) => p !== exclusive);
      if (max && next.length > max) {
        // Drop the earliest selection so the user's most recent click wins.
        next = next.slice(next.length - max);
      }
      return next;
    });
  };

  const isHaltKind = question.kind === 'multi-halt';

  return (
    <ChipsContainer>
      {(question.options ?? []).map((opt) => {
        const isExclusive = opt.label === exclusive;
        const sel = picks.includes(opt.label);
        const color = isHaltKind && !isExclusive ? '#ef4444' : '#14b8a6';
        return (
          <Chip
            key={opt.label}
            label={opt.label}
            sel={sel}
            color={color}
            disabled={isResolved}
            onClick={() => toggle(opt.label)}
          />
        );
      })}
      {!isResolved && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
          <Btn
            disabled={picks.length === 0}
            onClick={() => {
              const label =
                picks.length === 1
                  ? picks[0] ?? ''
                  : picks.length === 0
                  ? 'None'
                  : `${picks.length} selected`;
              onSubmit(picks, label);
            }}
          >
            Continue
          </Btn>
        </div>
      )}
    </ChipsContainer>
  );
}

// Matrix input — one row per sub-item, 4 rating chips per row.
function MatrixInput({
  question,
  resolved,
  onSubmit,
}: {
  question: QSQuestion;
  resolved?: Record<string, string>;
  onSubmit: (value: Record<string, string>, label: string) => void;
}) {
  const isResolved = resolved !== undefined;
  const [ratings, setRatings] = useState<Record<string, string>>(resolved ?? {});
  const subs = question.subItems ?? [];
  const allRated = subs.every((s) => !!ratings[s.id]);

  return (
    <GC v="elevated" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {subs.map((sub) => (
        <div key={sub.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Lbl color="#94a3b8">{sub.label}</Lbl>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {MATRIX_RATINGS.map((r) => {
              const sel = ratings[sub.id] === r;
              const color =
                r === 'Cannot do at all'
                  ? '#ef4444'
                  : r === 'Quite a bit'
                  ? '#f59e0b'
                  : r === 'A little'
                  ? '#14b8a6'
                  : '#22c55e';
              return (
                <Chip
                  key={r}
                  label={r}
                  sel={sel}
                  color={color}
                  disabled={isResolved}
                  onClick={() =>
                    setRatings((prev) => ({ ...prev, [sub.id]: r }))
                  }
                />
              );
            })}
          </div>
        </div>
      ))}
      {!isResolved && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
          <Btn
            disabled={!allRated}
            onClick={() => {
              const summary = subs
                .map((s) => `${s.label.split(' ').slice(0, 4).join(' ')}…: ${ratings[s.id]}`)
                .join(' • ');
              onSubmit(ratings, summary);
            }}
          >
            Continue
          </Btn>
        </div>
      )}
    </GC>
  );
}

function ChipsContainer({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        marginTop: 4,
      }}
    >
      {children}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div
        style={{
          padding: '10px 14px',
          borderRadius: 16,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          gap: 4,
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#14b8a6',
              animation: `qs-bounce 1.2s infinite ${i * 0.18}s`,
              opacity: 0.7,
            }}
          />
        ))}
        <style>{`@keyframes qs-bounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.4 } 40% { transform: translateY(-4px); opacity: 1 } }`}</style>
      </div>
    </div>
  );
}
