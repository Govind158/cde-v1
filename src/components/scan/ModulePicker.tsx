/**
 * Kriya Scan — Secondary picker for QuickScan modules.
 *
 * Shared component used by both location & condition pickers. Renders a
 * grid of module cards. Available modules are tappable; unavailable ones
 * show a "Coming v1.1" pill and are non-interactive.
 *
 * UX rationale:
 *   - Showing the full set (including coming-soon) sets expectation that the
 *     framework is broader than what is shippable today, without misleading
 *     the user into starting an unfinished module.
 *   - Each card states the time-to-complete so users can self-pace.
 */

'use client';

import { GC } from '../diagnostics/primitives';
import type { QSModuleListing } from '../quickscan/modules';

interface Props {
  title: string;
  subtitle: string;
  modules: QSModuleListing[];
  onSelect: (moduleId: string) => void;
  onBack: () => void;
}

export function ModulePicker({ title, subtitle, modules, onSelect, onBack }: Props) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(20,184,166,0.12) 0%, transparent 60%), #020617',
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
          gap: 14,
          paddingTop: 18,
          paddingBottom: 24,
        }}
      >
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: '#cbd5e1',
              borderRadius: 10,
              width: 40,
              height: 40,
              fontSize: 18,
              cursor: 'pointer',
            }}
          >
            ←
          </button>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#14b8a6',
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
              }}
            >
              QuickScan
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: '#f8fafc',
                lineHeight: 1.25,
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, padding: '0 4px' }}>
          {subtitle}
        </div>

        {/* Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
          {modules.map((m) => (
            <ModuleCard
              key={m.id}
              listing={m}
              onClick={m.available ? () => onSelect(m.id) : undefined}
            />
          ))}
        </div>

        <div
          style={{
            marginTop: 4,
            fontSize: 11,
            color: '#64748b',
            lineHeight: 1.55,
            padding: '8px 12px',
          }}
        >
          More modules are scheduled for clinical advisory board sign-off and
          will become available in subsequent releases.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────

function ModuleCard({
  listing,
  onClick,
}: {
  listing: QSModuleListing;
  onClick?: () => void;
}) {
  const disabled = !listing.available;
  return (
    <GC
      v="default"
      onClick={onClick}
      style={{
        padding: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: 'rgba(20,184,166,0.10)',
          border: '1px solid rgba(20,184,166,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#14b8a6',
          fontWeight: 700,
        }}
      >
        {listing.displayName.split(' ').map((w) => w[0]).join('').slice(0, 2)}
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
          <span style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>
            {listing.displayName}
          </span>
          {disabled ? (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: '#fcd34d',
                padding: '2px 8px',
                borderRadius: 9999,
                background: 'rgba(245,158,11,0.10)',
                border: '1px solid rgba(245,158,11,0.30)',
                textTransform: 'uppercase',
                letterSpacing: '0.10em',
              }}
            >
              Coming v1.1
            </span>
          ) : (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: '#86efac',
                padding: '2px 8px',
                borderRadius: 9999,
                background: 'rgba(34,197,94,0.10)',
                border: '1px solid rgba(34,197,94,0.30)',
                textTransform: 'uppercase',
                letterSpacing: '0.10em',
              }}
            >
              Available
            </span>
          )}
          <span
            style={{
              fontSize: 10,
              color: '#64748b',
              marginLeft: 'auto',
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            {listing.estimatedMinutes} min
          </span>
        </div>
        <div
          style={{
            fontSize: 12,
            color: '#94a3b8',
            marginTop: 4,
            lineHeight: 1.5,
          }}
        >
          {listing.shortDescription}
        </div>
      </div>
      {!disabled && (
        <div style={{ color: '#14b8a6', fontWeight: 800, fontSize: 16 }}>→</div>
      )}
    </GC>
  );
}
