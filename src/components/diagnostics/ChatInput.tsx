/**
 * Kriya Pain Diagnostics — Chat Input Panel
 *
 * Contextual input area. The orchestrator selects which kind of input
 * to render (chips-single / chips-multi / range / number / height-weight /
 * info / processing / results) based on the active question node.
 *
 * chips-single and chips-multi options are rendered inline in the chat
 * transcript (as chips-question bubbles) — the footer only surfaces the
 * shared free-text bar for those kinds. range / number / text / height-weight
 * render their structured input in the footer.
 *
 * For every question-like input a free-text textarea is also rendered below
 * the structured input. If the user types there and hits Send, the orchestrator
 * routes that text through the LLM extractor instead of the node's own handler.
 *
 * Design tokens: Kriya.care dark glassmorphism (kriya-ui-design skill).
 */

'use client';

import { useEffect, useState } from 'react';
import { Btn, KI, Lbl } from './primitives';
import type { InputKind } from './questionnaire';

interface Props {
  kind: InputKind;
  prompt?: string;
  /** For range — current value (default 5). */
  rangeValue?: number;
  /** For number/text — current value. */
  textValue?: string;
  /** For height-weight — current values. */
  heightValue?: string;
  weightValue?: string;
  /** Invoked when the user commits a numeric/text answer. */
  onSubmit: (value: string) => void;
  /** Invoked when the user commits height+weight together. */
  onSubmitHeightWeight: (h: string, w: string) => void;
  /** Invoked when the user commits a range value. */
  onSubmitRange: (value: number) => void;
  /** Invoked when the user types free text (routed to the LLM extractor). */
  onSubmitFreeText?: (text: string) => void;
  /** Used by the welcome step's "Begin" button. */
  onAdvance: () => void;
  /** When processing. */
  processing?: boolean;
  /** When results — render restart. */
  onRestart?: () => void;
  /** Disable all inputs (e.g. while an extraction is awaiting confirmation). */
  disabled?: boolean;
}

const FOOTER_WRAP: React.CSSProperties = {
  padding: '14px 16px 16px',
  borderTop: '1px solid rgba(255,255,255,0.06)',
  background:
    'linear-gradient(180deg, rgba(2,6,23,0.0) 0%, rgba(2,6,23,0.6) 100%)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
};

export function ChatInput(props: Props) {
  const {
    kind,
    prompt,
    rangeValue = 5,
    textValue = '',
    heightValue = '',
    weightValue = '',
    onSubmit,
    onSubmitHeightWeight,
    onSubmitRange,
    onSubmitFreeText,
    onAdvance,
    processing,
    onRestart,
    disabled,
  } = props;

  const [num, setNum] = useState<string>(textValue);
  const [h, setH] = useState<string>(heightValue);
  const [w, setW] = useState<string>(weightValue);
  const [range, setRange] = useState<number>(rangeValue);
  const [free, setFree] = useState<string>('');

  // Reset local buffers when the active question changes.
  useEffect(() => {
    setNum(textValue);
    setH(heightValue);
    setW(weightValue);
    setRange(rangeValue);
    setFree('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, prompt]);

  if (kind === 'processing' || processing) {
    return (
      <div style={{ ...FOOTER_WRAP, textAlign: 'center', padding: '22px 16px' }}>
        <div
          style={{
            width: 36,
            height: 36,
            border: '3px solid rgba(20,184,166,0.2)',
            borderTopColor: '#14b8a6',
            borderRadius: '50%',
            margin: '0 auto 12px',
            animation: 'kriya-spin 1s linear infinite',
          }}
        />
        <p
          style={{
            fontSize: 12,
            color: '#94a3b8',
            margin: 0,
            letterSpacing: '0.02em',
          }}
        >
          {disabled ? 'Understanding your description…' : 'Running diagnostic engine…'}
        </p>
        <style>{`@keyframes kriya-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (kind === 'results') {
    return (
      <div style={{ ...FOOTER_WRAP, textAlign: 'center' }}>
        <Btn onClick={onRestart}>Start New Assessment</Btn>
      </div>
    );
  }

  if (kind === 'info') {
    return (
      <div style={{ ...FOOTER_WRAP, textAlign: 'center' }}>
        <Btn onClick={onAdvance} disabled={disabled}>
          Begin Assessment →
        </Btn>
      </div>
    );
  }

  // Free-text bar shared across every question kind.
  const freeBar = onSubmitFreeText ? (
    <div
      style={{
        marginTop: 14,
        paddingTop: 12,
        borderTop: '1px dashed rgba(255,255,255,0.10)',
        display: 'flex',
        gap: 8,
        alignItems: 'flex-end',
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 10,
            color: '#64748b',
            marginBottom: 6,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            fontWeight: 600,
          }}
        >
          Or describe in your own words
        </div>
        <textarea
          value={free}
          onChange={(e) => setFree(e.target.value)}
          disabled={disabled}
          rows={2}
          placeholder="e.g. I've had lower back pain for a month, worse when getting out of bed…"
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)',
            color: '#f8fafc',
            fontSize: 13,
            lineHeight: 1.45,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            resize: 'none',
            outline: 'none',
            boxSizing: 'border-box',
            opacity: disabled ? 0.5 : 1,
            transition: 'border-color 200ms ease, background 200ms ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(20,184,166,0.55)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
          }}
        />
      </div>
      <button
        type="button"
        disabled={disabled || !free.trim()}
        onClick={() => {
          const t = free.trim();
          if (!t) return;
          onSubmitFreeText(t);
          setFree('');
        }}
        style={{
          minHeight: 44,
          padding: '10px 16px',
          borderRadius: 10,
          border: '1px solid rgba(20,184,166,0.35)',
          background:
            disabled || !free.trim()
              ? 'rgba(20,184,166,0.08)'
              : 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
          color: disabled || !free.trim() ? 'rgba(148,163,184,0.5)' : '#f8fafc',
          fontWeight: 700,
          fontSize: 13,
          cursor: disabled || !free.trim() ? 'not-allowed' : 'pointer',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          whiteSpace: 'nowrap',
          boxShadow:
            disabled || !free.trim()
              ? 'none'
              : '0 4px 14px rgba(20,184,166,0.30), inset 0 1px 0 rgba(255,255,255,0.18)',
          transition: 'transform 200ms ease',
        }}
        onMouseDown={(e) => {
          if (!(disabled || !free.trim())) e.currentTarget.style.transform = 'scale(0.97)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        Send →
      </button>
    </div>
  ) : null;

  // chips-single / chips-multi render their options inline in the chat transcript.
  // The footer only surfaces the shared free-text bar so the user can still type
  // a free-text answer routed through the LLM extractor.
  if (kind === 'chips-single' || kind === 'chips-multi') {
    return <div style={FOOTER_WRAP}>{freeBar}</div>;
  }

  if (kind === 'range') {
    const col = range >= 7 ? '#ef4444' : range >= 4 ? '#f59e0b' : '#22c55e';
    return (
      <div style={FOOTER_WRAP}>
        {prompt && <Lbl>{`${prompt} · ${range}/10`}</Lbl>}
        <input
          type="range"
          min={1}
          max={10}
          value={range}
          disabled={disabled}
          onChange={(e) => setRange(parseInt(e.target.value, 10))}
          style={{
            width: '100%',
            accentColor: col,
            opacity: disabled ? 0.5 : 1,
            marginTop: 2,
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10,
            color: '#64748b',
            marginBottom: 12,
            marginTop: 4,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            fontWeight: 600,
          }}
        >
          <span>1 · Least</span>
          <span>10 · Unbearable</span>
        </div>
        <Btn onClick={() => onSubmitRange(range)} disabled={disabled}>
          Send →
        </Btn>
        {freeBar}
      </div>
    );
  }

  if (kind === 'number' || kind === 'text') {
    return (
      <div style={FOOTER_WRAP}>
        {prompt && <Lbl>{prompt}</Lbl>}
        <div style={{ marginBottom: 12 }}>
          <KI
            type={kind === 'number' ? 'number' : 'text'}
            value={num}
            onChange={setNum}
            placeholder={kind === 'number' ? 'Enter a number' : 'Type your answer'}
          />
        </div>
        <Btn disabled={!num.trim() || disabled} onClick={() => onSubmit(num.trim())}>
          Send →
        </Btn>
        {freeBar}
      </div>
    );
  }

  if (kind === 'height-weight') {
    const valid = !!h.trim() && !!w.trim() && !disabled;
    return (
      <div style={FOOTER_WRAP}>
        {prompt && <Lbl>{prompt}</Lbl>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <Lbl>Height (cm)</Lbl>
            <KI type="number" value={h} onChange={setH} placeholder="170" />
          </div>
          <div>
            <Lbl>Weight (kg)</Lbl>
            <KI type="number" value={w} onChange={setW} placeholder="70" />
          </div>
        </div>
        <Btn disabled={!valid} onClick={() => onSubmitHeightWeight(h.trim(), w.trim())}>
          Send →
        </Btn>
        {freeBar}
      </div>
    );
  }

  return null;
}
