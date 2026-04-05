/**
 * Care Pathway Card — Care recommendation display
 */

'use client';

interface CarePathwayCardProps {
  name: string;
  durationWeeks: number;
  providerTypes: string[];
  description: string;
  phases?: { name: string; description: string }[];
  onEnroll?: () => void;
}

export default function CarePathwayCard({
  name,
  durationWeeks,
  providerTypes,
  description,
  phases,
  onEnroll,
}: CarePathwayCardProps) {
  return (
    <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
      <h3 className="text-base font-semibold text-green-300">{name}</h3>
      <p className="mt-1 text-xs text-slate-400">
        {durationWeeks} weeks &middot; {providerTypes.join(', ')}
      </p>
      <p className="mt-3 text-sm text-slate-300">{description}</p>

      {phases && phases.length > 0 && (
        <div className="mt-3 space-y-1">
          {phases.map((phase, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-0.5 text-xs text-green-400">Phase {i + 1}:</span>
              <span className="text-xs text-slate-400">{phase.name}</span>
            </div>
          ))}
        </div>
      )}

      {onEnroll && (
        <button
          onClick={onEnroll}
          className="mt-4 w-full rounded-xl bg-green-600 py-2.5 text-sm font-medium text-white transition-all hover:bg-green-500"
        >
          Start Program →
        </button>
      )}
    </div>
  );
}
