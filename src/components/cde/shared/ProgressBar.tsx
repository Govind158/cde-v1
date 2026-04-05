/**
 * Progress Bar — Layer progress indicator
 */

'use client';

interface ProgressBarProps {
  percent: number;
  currentLayer: number;
}

export default function ProgressBar({ percent, currentLayer }: ProgressBarProps) {
  const layerNames = ['Safety Screen', 'Symptoms', 'Impact', 'Risk Factors'];
  const label = layerNames[currentLayer] ?? 'Assessment';

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
        <span className="text-[10px] text-slate-500">{percent}%</span>
      </div>
      <div className="h-1 w-full rounded-full bg-white/5">
        <div
          className="h-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}
