/**
 * Cross Scan Card — Recommendation for related scan
 */

'use client';

interface CrossScanCardProps {
  targetModule: string;
  reason: string;
  onStart?: () => void;
}

export default function CrossScanCard({ targetModule, reason, onStart }: CrossScanCardProps) {
  return (
    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
      <p className="text-sm text-cyan-300">{reason}</p>
      <button
        onClick={onStart}
        className="mt-3 text-sm font-medium text-cyan-400 transition-colors hover:text-cyan-300"
      >
        Start {targetModule} Scan →
      </button>
    </div>
  );
}
