/**
 * Risk Tier Badge — Color-coded risk level indicator
 */

'use client';

import type { RiskTier } from '@/types/cde';

interface RiskTierBadgeProps {
  tier: RiskTier;
  description?: string;
}

const TIER_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  RED: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Emergency — Seek Immediate Medical Attention' },
  ORANGE: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', label: 'Urgent — Clinical Evaluation Within 1-2 Weeks' },
  YELLOW: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Moderate — Guided Care Program Recommended' },
  GREEN: { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', label: 'Mild — Self-Guided Program Appropriate' },
  BLUE: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: 'Wellness — Performance Benchmark' },
};

export default function RiskTierBadge({ tier, description }: RiskTierBadgeProps) {
  const config = TIER_CONFIG[tier] ?? TIER_CONFIG.GREEN;

  return (
    <div className={`rounded-xl border p-4 ${config.bg} ${config.border}`}>
      <div className={`text-sm font-semibold uppercase tracking-wide ${config.color}`}>
        Risk Level: {tier}
      </div>
      <p className="mt-1 text-sm text-slate-300">{description ?? config.label}</p>
    </div>
  );
}
