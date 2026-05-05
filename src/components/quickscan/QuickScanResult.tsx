/**
 * Kriya QuickScan — Result Card
 *
 * Renders three modes:
 *   - halt (emergency)  : red glow, helpline CTAs, no risk score shown
 *   - halt (urgent)     : amber glow, urgent referral guidance
 *   - tier              : risk tier ring, interpretation, CTA stack, condition tags
 *
 * Inviolable rules enforced:
 *   - Standing disclaimer is always shown.
 *   - Layer-0 halts NEVER show a numeric risk score (PRD §6.1).
 *   - DeepScan CTA carries the module's regionHint to pre-fill DeepScan.
 *
 * Stub CTAs (Kriya Play / Care / Myo AI) call `onStubCTA` so the parent can
 * surface a coming-soon toast. DeepScan CTA calls `onLaunchDeepScan`.
 */

'use client';

import { Btn, GC } from '../diagnostics/primitives';
import type {
  QSCTAStub,
  QSHaltResult,
  QSResult,
  QSRouting,
  QSTier,
  QSTierResult,
} from './types';

const TIER_COLORS: Record<QSTier, { bg: string; border: string; text: string; ring: string; label: string }> = {
  low: {
    bg: 'rgba(34,197,94,0.12)',
    border: 'rgba(34,197,94,0.35)',
    text: '#86efac',
    ring: '#22c55e',
    label: 'Low risk signal',
  },
  moderate: {
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.35)',
    text: '#fcd34d',
    ring: '#f59e0b',
    label: 'Moderate risk signal',
  },
  high: {
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.35)',
    text: '#fca5a5',
    ring: '#ef4444',
    label: 'Elevated risk signal',
  },
};

interface Props {
  result: QSResult;
  onLaunchDeepScan: (regionHint?: string) => void;
  onStubCTA?: (destination: string, label: string) => void;
  onRestart: () => void;
}

export function QuickScanResult({ result, onLaunchDeepScan, onStubCTA, onRestart }: Props) {
  if (result.halted) {
    return <HaltCard result={result} onRestart={onRestart} />;
  }
  return (
    <TierCard
      result={result}
      onLaunchDeepScan={onLaunchDeepScan}
      onStubCTA={onStubCTA}
      onRestart={onRestart}
    />
  );
}

// ─────────────────────────────────────────────────────────────────
// Halt card

function HaltCard({ result, onRestart }: { result: QSHaltResult; onRestart: () => void }) {
  const isEmergency = result.haltKind === 'emergency';
  const accent = isEmergency ? '#ef4444' : '#f59e0b';
  return (
    <GC
      v="pain"
      style={{
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        borderColor: `${accent}55`,
        boxShadow: `0 0 32px ${accent}22, inset 0 1px 0 rgba(255,255,255,0.10)`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 11,
          fontWeight: 700,
          color: accent,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: accent,
            boxShadow: `0 0 10px ${accent}`,
            animation: 'qs-pulse 1.4s infinite',
          }}
        />
        {isEmergency ? 'Emergency referral' : 'Urgent referral'}
        <style>{`@keyframes qs-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
      </div>
      <div style={{ fontSize: 17, fontWeight: 800, color: '#f8fafc', lineHeight: 1.3 }}>
        {result.heading}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {result.body.map((line, i) => (
          <div key={i} style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.55 }}>
            {line}
          </div>
        ))}
      </div>
      <div
        style={{
          padding: 12,
          borderRadius: 10,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.10em',
            marginBottom: 6,
          }}
        >
          What you flagged
        </div>
        <ul style={{ margin: 0, paddingInlineStart: 18, color: '#e2e8f0', fontSize: 13 }}>
          {result.triggerOptions.map((t) => (
            <li key={t} style={{ marginBottom: 4 }}>
              {t}
            </li>
          ))}
        </ul>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {result.helplineCTAs.map((cta) => (
          <Btn
            key={cta.label}
            onClick={() =>
              alert(
                `(stub) ${cta.label} — in production this would ${
                  cta.type === 'call' ? 'open the dialer' : 'navigate to a partner directory'
                }.`,
              )
            }
            style={{
              background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
              border: `1px solid ${accent}`,
              boxShadow: `0 4px 18px ${accent}55, inset 0 1px 0 rgba(255,255,255,0.18)`,
            }}
          >
            {cta.label}
          </Btn>
        ))}
      </div>
      <DisclaimerBlock text={result.disclaimer} />
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
        <Btn ghost onClick={onRestart}>
          Back to scan menu
        </Btn>
      </div>
    </GC>
  );
}

// ─────────────────────────────────────────────────────────────────
// Tier card

function TierCard({
  result,
  onLaunchDeepScan,
  onStubCTA,
  onRestart,
}: {
  result: QSTierResult;
  onLaunchDeepScan: (regionHint?: string) => void;
  onStubCTA?: (destination: string, label: string) => void;
  onRestart: () => void;
}) {
  const tone = TIER_COLORS[result.tier];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Hero */}
      <GC
        v="elevated"
        style={{
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: tone.text,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
              }}
            >
              {tone.label}
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: '#f8fafc',
                marginTop: 2,
              }}
            >
              {result.moduleDisplayName}
            </div>
          </div>
          <RiskRing tier={result.tier} />
        </div>
        <div style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.55 }}>
          {result.routing.interpretation}
        </div>
        {result.hardFlagApplied && (
          <div
            style={{
              padding: 10,
              borderRadius: 10,
              background: 'rgba(239,68,68,0.10)',
              border: '1px solid rgba(239,68,68,0.25)',
              fontSize: 12,
              color: '#fca5a5',
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: '#fecaca' }}>Clinical override:</strong>{' '}
            {result.hardFlagApplied.description}. We have set the risk to elevated
            regardless of overall score for safety.
          </div>
        )}
        {result.callouts.map((c, i) => (
          <div
            key={i}
            style={{
              padding: 10,
              borderRadius: 10,
              background: 'rgba(245,158,11,0.10)',
              border: '1px solid rgba(245,158,11,0.30)',
              fontSize: 12,
              color: '#fcd34d',
              lineHeight: 1.5,
            }}
          >
            {c}
          </div>
        ))}
        {result.conditionTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {result.conditionTags.map((t) => (
              <span
                key={t}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 9999,
                  background: tone.bg,
                  color: tone.text,
                  border: `1px solid ${tone.border}`,
                  letterSpacing: '0.02em',
                }}
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </GC>

      {/* CTA stack */}
      <CTAStack
        routing={result.routing}
        onLaunchDeepScan={() => onLaunchDeepScan(result.deepScanRegion)}
        onStubCTA={onStubCTA}
      />

      {/* Tip */}
      {result.routing.tip && (
        <GC
          v="default"
          style={{
            padding: 14,
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              fontSize: 18,
              lineHeight: 1,
              filter: 'drop-shadow(0 0 6px rgba(20,184,166,0.6))',
            }}
          >
            💡
          </div>
          <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.55 }}>
            {result.routing.tip}
          </div>
        </GC>
      )}

      {/* Score breakdown — collapsed by default for clinical audit */}
      <ScoreBreakdown result={result} />

      <DisclaimerBlock text={result.disclaimer} />

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 4 }}>
        <Btn ghost onClick={onRestart}>
          Back to scan menu
        </Btn>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-components

function RiskRing({ tier }: { tier: QSTier }) {
  const tone = TIER_COLORS[tier];
  const fillPct = tier === 'low' ? 0.33 : tier === 'moderate' ? 0.66 : 1;
  const C = 2 * Math.PI * 28;
  return (
    <div style={{ position: 'relative', width: 72, height: 72 }}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r="28" stroke="rgba(255,255,255,0.08)" strokeWidth="6" fill="none" />
        <circle
          cx="36"
          cy="36"
          r="28"
          stroke={tone.ring}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${C * fillPct} ${C}`}
          transform="rotate(-90 36 36)"
          style={{ filter: `drop-shadow(0 0 6px ${tone.ring}cc)` }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, color: tone.text }}>
          {tier === 'low' ? 'Low' : tier === 'moderate' ? 'Mod' : 'High'}
        </div>
      </div>
    </div>
  );
}

function CTAStack({
  routing,
  onLaunchDeepScan,
  onStubCTA,
}: {
  routing: QSRouting;
  onLaunchDeepScan: () => void;
  onStubCTA?: (destination: string, label: string) => void;
}) {
  const handleCTA = (cta: QSCTAStub | { label: string; destination: 'deepscan' | 'specialist' }) => {
    if ('destination' in cta && cta.destination === 'deepscan') {
      onLaunchDeepScan();
      return;
    }
    if ('destination' in cta && cta.destination === 'specialist') {
      alert(
        '(stub) In production this would open your nearest empanelled specialist directory.',
      );
      return;
    }
    onStubCTA?.(cta.destination, cta.label);
  };

  const renderRow = (cta: QSCTAStub | { label: string; destination: 'deepscan' | 'specialist' }, primary: boolean) => {
    const isDeep = 'destination' in cta && cta.destination === 'deepscan';
    return (
      <Btn
        ghost={!primary && !isDeep}
        onClick={() => handleCTA(cta)}
        style={{
          width: '100%',
          justifyContent: 'center',
          // DeepScan CTA always teal even if positioned as tertiary.
          ...(isDeep
            ? {
                background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
                border: '1px solid rgba(20,184,166,0.30)',
                color: '#f8fafc',
                boxShadow: '0 4px 18px rgba(20,184,166,0.35), inset 0 1px 0 rgba(255,255,255,0.18)',
              }
            : {}),
        }}
      >
        {cta.label}
      </Btn>
    );
  };

  return (
    <GC v="elevated" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '0.10em',
        }}
      >
        Recommended next steps
      </div>
      {renderRow(routing.primaryCTA, true)}
      {routing.secondaryCTA && renderRow(routing.secondaryCTA, false)}
      {routing.tertiaryCTA && renderRow(routing.tertiaryCTA, false)}
      {routing.mandatoryDeepScanPrompt && (
        <div
          style={{
            fontSize: 12,
            color: '#fca5a5',
            padding: '8px 10px',
            borderRadius: 8,
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.20)',
            lineHeight: 1.5,
          }}
        >
          For a more detailed signal analysis, we strongly recommend completing a DeepScan.
        </div>
      )}
    </GC>
  );
}

function ScoreBreakdown({ result }: { result: QSTierResult }) {
  return (
    <details
      style={{
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
        padding: 0,
        color: '#94a3b8',
      }}
    >
      <summary
        style={{
          listStyle: 'none',
          cursor: 'pointer',
          padding: '10px 14px',
          fontSize: 12,
          fontWeight: 600,
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '0.10em',
        }}
      >
        Score breakdown ({result.totalScore} pts) — for your records
      </summary>
      <div style={{ padding: '0 14px 12px', fontSize: 12, color: '#cbd5e1' }}>
        {result.contributions.length === 0 ? (
          <div>No scored responses recorded.</div>
        ) : (
          <ul style={{ margin: 0, paddingInlineStart: 16 }}>
            {result.contributions.map((c, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                <code style={{ color: '#7dd3fc' }}>{c.questionId}</code> · L{c.layer} · +
                {c.points} <span style={{ color: '#64748b' }}>({c.source})</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

function DisclaimerBlock({ text }: { text: string }) {
  return (
    <div
      style={{
        fontSize: 11,
        color: '#64748b',
        lineHeight: 1.6,
        padding: 10,
        borderRadius: 8,
        background: 'rgba(255,255,255,0.02)',
        border: '1px dashed rgba(255,255,255,0.06)',
      }}
    >
      <strong style={{ color: '#94a3b8' }}>Disclaimer:</strong> {text}
    </div>
  );
}
