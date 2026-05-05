/**
 * Kriya Scan — Top-level mode chooser.
 *
 * Three cards: QuickScan by Pain (Condition), QuickScan by Location, DeepScan.
 * Designed mobile-first to match Kriya's dark glass-morphism aesthetic.
 *
 * UX rationale (Product / Clinical):
 *   - Time and depth signaled prominently. Users self-select: "I want a quick
 *     read on my low back" → 3 min Location; "I have disc bulge" → 3 min
 *     Condition; "Comprehensive risk picture" → 12 min DeepScan.
 *   - DeepScan is the most clinically thorough — given a slightly deeper
 *     visual weight (glow card variant) without being pushy.
 *   - The chooser is the FIRST screen — replaces the previous welcome bubble.
 */

'use client';

import { GC } from '../diagnostics/primitives';

export type ScanMode = 'quickscan-condition' | 'quickscan-location' | 'deepscan';

interface Props {
  onSelect: (mode: ScanMode) => void;
}

export function ScanChooser({ onSelect }: Props) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(20,184,166,0.14) 0%, transparent 60%), #020617',
        display: 'flex',
        justifyContent: 'center',
        padding: 16,
        boxSizing: 'border-box',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          paddingTop: 32,
          paddingBottom: 24,
        }}
      >
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 16px',
              borderRadius: 9999,
              background: 'rgba(20,184,166,0.08)',
              border: '1px solid rgba(20,184,166,0.20)',
            }}
          >
            <KriyaSpark />
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: '#f8fafc',
                letterSpacing: '-0.01em',
              }}
            >
              Kriya
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#14b8a6',
                textTransform: 'uppercase',
                letterSpacing: '0.16em',
              }}
            >
              Scan
            </span>
          </div>
        </div>

        {/* Hero copy */}
        <div style={{ textAlign: 'center', padding: '4px 8px' }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: '#f8fafc',
              margin: 0,
              lineHeight: 1.25,
              letterSpacing: '-0.01em',
            }}
          >
            Choose your scan
          </h1>
        </div>

        {/* Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 6 }}>
          <ChooserCard
            title="By Location"
            subtitle="Where does it hurt?"
            example="e.g. low back, knee, neck"
            timeLabel="2–3 min"
            icon={<LocationIcon />}
            onClick={() => onSelect('quickscan-location')}
            accent="#14b8a6"
          />
          <ChooserCard
            title="By Condition"
            subtitle="A condition you know about."
            example="e.g. disc bulge, sciatica, OA"
            timeLabel="2–3 min"
            icon={<PillIcon />}
            onClick={() => onSelect('quickscan-condition')}
            accent="#0ea5e9"
          />
          <ChooserCard
            title="DeepScan"
            subtitle="Full risk assessment with top-3 signal."
            example="not sure where to start"
            timeLabel="10–15 min"
            icon={<DeepIcon />}
            onClick={() => onSelect('deepscan')}
            accent="#a855f7"
            featured
          />
        </div>

        {/* Footer disclaimer */}
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            color: '#64748b',
            lineHeight: 1.55,
            textAlign: 'center',
          }}
        >
          Risk-signal tools — not a medical diagnosis.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Card primitive

interface CardProps {
  title: string;
  subtitle: string;
  /** Short illustrative example shown beneath the subtitle. */
  example?: string;
  timeLabel: string;
  icon: React.ReactNode;
  accent: string;
  featured?: boolean;
  onClick: () => void;
}

function ChooserCard({
  title,
  subtitle,
  example,
  timeLabel,
  icon,
  accent,
  featured = false,
  onClick,
}: CardProps) {
  return (
    <GC
      v={featured ? 'glow' : 'default'}
      onClick={onClick}
      style={{
        padding: 16,
        display: 'flex',
        gap: 14,
        alignItems: 'center',
        cursor: 'pointer',
        position: 'relative',
        borderColor: featured ? `${accent}55` : undefined,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          minWidth: 48,
          borderRadius: 12,
          background: `${accent}15`,
          border: `1px solid ${accent}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accent,
          boxShadow: `0 0 18px ${accent}33, inset 0 1px 0 rgba(255,255,255,0.10)`,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#f8fafc',
              lineHeight: 1.2,
            }}
          >
            {title}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: '#94a3b8',
              padding: '2px 8px',
              borderRadius: 9999,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              letterSpacing: '0.04em',
            }}
          >
            {timeLabel}
          </span>
        </div>
        <div
          style={{
            fontSize: 13,
            color: '#94a3b8',
            marginTop: 4,
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </div>
        {example && (
          <div
            style={{
              fontSize: 11,
              color: accent,
              marginTop: 4,
              lineHeight: 1.4,
              fontWeight: 600,
              opacity: 0.85,
            }}
          >
            {example}
          </div>
        )}
      </div>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accent,
          fontWeight: 800,
          fontSize: 16,
        }}
      >
        →
      </div>
    </GC>
  );
}

// ─────────────────────────────────────────────────────────────────
// Inline icons (no external lib)

function LocationIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s-7-7.5-7-13a7 7 0 1 1 14 0c0 5.5-7 13-7 13z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function PillIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="9" width="18" height="6" rx="3" />
      <path d="M12 9v6" />
    </svg>
  );
}

function DeepIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h4l2-7 4 14 2-7h6" />
    </svg>
  );
}

function KriyaSpark() {
  return (
    <svg viewBox="0 0 100 100" width="22" height="22" style={{ filter: 'drop-shadow(0 0 6px rgba(20,184,166,0.7))' }}>
      <defs>
        <linearGradient id="ks-spark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
      </defs>
      <path
        d="M25 50 C25 35,40 35,50 50 C60 65,75 65,75 50 C75 35,60 35,50 50 C40 65,25 65,25 50"
        fill="none"
        stroke="url(#ks-spark)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle cx="50" cy="50" r="4" fill="#2dd4bf" />
    </svg>
  );
}
