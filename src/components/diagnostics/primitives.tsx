/**
 * Kriya Pain Diagnostics — UI Primitives
 * Design system: Kriya.care landing design language (clinical teal + dark glass).
 *
 * Primary accent:  #14b8a6 (teal-500)   — CTAs, labels, glow borders, badges
 * Accent hover:    #0d9488 (teal-600)   — pressed / gradient end
 * Secondary:       #3b82f6 (blue-500)   — user message bubbles, info surfaces
 * Tokens derived from LANDING_PAGE_DESIGN.md + kriya-ui-design skill.
 */

'use client';

import type { CSSProperties, ReactNode } from 'react';

interface GCProps {
  children: ReactNode;
  /**
   * Card variant:
   *  - default : standard content card (white/5 surface, 1px inner glow)
   *  - glow    : hero/featured card with teal tint (brand accent)
   *  - pain    : red-tinted card for severity/red-flag callouts
   *  - elevated: slightly brighter surface (white/8) for layered content
   */
  v?: 'default' | 'glow' | 'pain' | 'elevated';
  style?: CSSProperties;
  onClick?: () => void;
}

/**
 * Glass card — the primary container. Follows Kriya design system:
 *   border-radius: 16px
 *   background:    rgba(255,255,255,0.05)
 *   border:        1px solid rgba(255,255,255,0.08)
 *   inner glow:    inset 0 1px 0 rgba(255,255,255,0.10)
 *   blur:          20px
 */
export function GC({ children, v = 'default', onClick, style = {} }: GCProps) {
  let background: string;
  let border: string;
  let extraShadow = '';

  switch (v) {
    case 'glow':
      background =
        'linear-gradient(135deg, rgba(20,184,166,0.10) 0%, rgba(255,255,255,0.03) 60%)';
      border = '1px solid rgba(20,184,166,0.22)';
      break;
    case 'pain':
      background =
        'linear-gradient(135deg, rgba(239,68,68,0.10) 0%, rgba(255,255,255,0.03) 60%)';
      border = '1px solid rgba(239,68,68,0.20)';
      break;
    case 'elevated':
      background = 'rgba(255,255,255,0.08)';
      border = '1px solid rgba(255,255,255,0.12)';
      extraShadow = ', 0 8px 24px rgba(0,0,0,0.25)';
      break;
    case 'default':
    default:
      background = 'rgba(255,255,255,0.05)';
      border = '1px solid rgba(255,255,255,0.08)';
      break;
  }

  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 16,
        border,
        background,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.10)${extraShadow}`,
        transition: 'transform 200ms ease, box-shadow 200ms ease',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
      onMouseDown={(e) => {
        if (onClick) e.currentTarget.style.transform = 'scale(0.97)';
      }}
      onMouseUp={(e) => {
        if (onClick) e.currentTarget.style.transform = 'scale(1)';
      }}
      onMouseLeave={(e) => {
        if (onClick) e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {children}
    </div>
  );
}

interface BtnProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  ghost?: boolean;
  style?: CSSProperties;
}

/**
 * Primary action button. Clinical teal gradient, pill radius,
 * 44px min height for mobile touch targets, active:scale(0.97) feedback.
 */
export function Btn({ children, onClick, disabled, ghost, style = {} }: BtnProps) {
  const background = ghost
    ? 'rgba(255,255,255,0.05)'
    : disabled
    ? 'rgba(255,255,255,0.05)'
    : 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)';
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        minHeight: 44,
        padding: '12px 24px',
        borderRadius: 9999,
        border: ghost
          ? '1px solid rgba(255,255,255,0.12)'
          : '1px solid rgba(20,184,166,0.30)',
        background,
        color: disabled ? 'rgba(148,163,184,0.5)' : '#f8fafc',
        fontSize: 14,
        fontWeight: 700,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        letterSpacing: '0.01em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'transform 200ms ease, box-shadow 200ms ease',
        boxShadow:
          !ghost && !disabled
            ? '0 4px 18px rgba(20,184,166,0.35), inset 0 1px 0 rgba(255,255,255,0.18)'
            : 'inset 0 1px 0 rgba(255,255,255,0.05)',
        ...style,
      }}
      onMouseDown={(e) => {
        if (!disabled) e.currentTarget.style.transform = 'scale(0.97)';
      }}
      onMouseUp={(e) => {
        if (!disabled) e.currentTarget.style.transform = 'scale(1)';
      }}
      onMouseLeave={(e) => {
        if (!disabled) e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {children}
    </button>
  );
}

interface ChipProps {
  label: string;
  sel: boolean;
  onClick: () => void;
  color?: string;
  disabled?: boolean;
}

/**
 * Selectable chip. Uses clinical teal by default; callers can pass a semantic
 * color (red for red-flag symptoms, amber for multi, green for success).
 */
export function Chip({ label, sel, onClick, color, disabled }: ChipProps) {
  const accent = color ?? '#14b8a6';
  const borderCol = sel ? accent : 'rgba(255,255,255,0.12)';
  const bg = sel ? `${accent}22` : 'rgba(255,255,255,0.04)';
  const fg = sel ? accent : '#94a3b8';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '9px 14px',
        minHeight: 36,
        borderRadius: 9999,
        border: `1.5px solid ${borderCol}`,
        background: bg,
        color: disabled ? 'rgba(148,163,184,0.4)' : fg,
        fontSize: 13,
        fontWeight: sel ? 700 : 500,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'transform 200ms ease, background 200ms ease, border-color 200ms ease',
        textAlign: 'left',
        lineHeight: 1.4,
        boxShadow: sel ? `0 0 0 3px ${accent}14` : 'none',
      }}
      onMouseDown={(e) => {
        if (!disabled) e.currentTarget.style.transform = 'scale(0.97)';
      }}
      onMouseUp={(e) => {
        if (!disabled) e.currentTarget.style.transform = 'scale(1)';
      }}
      onMouseLeave={(e) => {
        if (!disabled) e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {label}
    </button>
  );
}

interface LblProps {
  children: ReactNode;
  color?: string;
}

/**
 * Micro-label. Design spec: text-[11px] font-semibold uppercase
 * tracking-[0.12em]. Clinical teal accent by default.
 */
export function Lbl({ children, color = '#14b8a6' }: LblProps) {
  return (
    <label
      style={{
        display: 'block',
        fontSize: 11,
        fontWeight: 600,
        color,
        marginBottom: 8,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
      }}
    >
      {children}
    </label>
  );
}

interface KIProps {
  value: string;
  onChange: (v: string) => void;
  type?: 'text' | 'number';
  placeholder?: string;
}

/**
 * Text / number input. Design spec: rounded-lg (10px), subtle white surface,
 * teal focus ring.
 */
export function KI({ value, onChange, type = 'text', placeholder = '' }: KIProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '12px 14px',
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.04)',
        color: '#f8fafc',
        fontSize: 14,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        outline: 'none',
        boxSizing: 'border-box',
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
  );
}
