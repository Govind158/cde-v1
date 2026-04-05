/**
 * Musculage Summary — Overall muscle age/score with parameter breakdown
 */

'use client';

interface MusculageSummaryProps {
  score: number;
  age: number | null;
  breakdown: { label: string; value: number | null }[];
}

function getScoreColor(val: number): string {
  if (val <= 25) return 'text-red-400';
  if (val <= 50) return 'text-amber-400';
  if (val <= 75) return 'text-blue-400';
  return 'text-green-400';
}

export default function MusculageSummary({ score, age, breakdown }: MusculageSummaryProps) {
  const ageGap = age ? Math.round((100 - score) / 10) : null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Your Musculage
          </h3>
          {ageGap !== null && ageGap > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              Your muscles function ~{ageGap} years older
            </p>
          )}
        </div>
        <div className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}</div>
      </div>

      <div className="mt-3 flex gap-2">
        {breakdown.map((item) => (
          <div key={item.label} className="flex-1 rounded-lg border border-white/5 bg-white/[0.02] p-2 text-center">
            <span className="text-[10px] text-slate-500 uppercase">{item.label}</span>
            <div className={`text-sm font-semibold ${item.value !== null ? getScoreColor(item.value) : 'text-slate-600'}`}>
              {item.value !== null ? item.value : '--'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
