/**
 * Score Card — Game score interpretation card
 */

'use client';

interface ScoreCardProps {
  gameId: string;
  parameter: string;
  percentile: number;
  interpretation: string;
  clinicalRelevance?: string;
}

function getScoreColor(percentile: number): { bg: string; border: string; text: string } {
  if (percentile <= 25) return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' };
  if (percentile <= 50) return { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' };
  if (percentile <= 75) return { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' };
  return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400' };
}

export default function ScoreCard({ gameId, parameter, percentile, interpretation, clinicalRelevance }: ScoreCardProps) {
  const colors = getScoreColor(percentile);

  return (
    <div className={`rounded-xl border p-4 ${colors.bg} ${colors.border}`}>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-400 uppercase">{parameter}</span>
          <p className="text-sm font-medium text-slate-200">{gameId}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-full border ${colors.border} ${colors.text}`} aria-label={`Score: ${percentile} out of 100`}>
          <span className="text-sm font-bold">{percentile}</span>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-300">{interpretation}</p>
      {clinicalRelevance && <p className="mt-1 text-xs text-slate-400">{clinicalRelevance}</p>}
    </div>
  );
}
