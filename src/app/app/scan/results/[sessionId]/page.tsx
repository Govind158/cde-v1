/**
 * Results Page — Scan results + care recommendations
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import type { RiskTier } from '@/types/cde';
import RiskTierBadge from '@/components/cde/results/RiskTierBadge';
import ScoreCard from '@/components/cde/results/ScoreCard';
import CarePathwayCard from '@/components/cde/results/CarePathwayCard';
import CrossScanCard from '@/components/cde/results/CrossScanCard';
import MusculageSummary from '@/components/cde/results/MusculageSummary';
import DisclaimerBanner from '@/components/cde/shared/DisclaimerBanner';

interface SessionData {
  summary: {
    totalScore: number;
    riskTier: RiskTier;
    hypotheses: { condition: string; confidence: string }[];
    layerScores: Record<string, number>;
    conditionTags: string[];
    musculageScore?: number;
    parameterScores?: { BAL: number | null; ROM: number | null; MOB: number | null; REF: number | null };
  };
  careRecommendation: {
    pathwayId: string;
    name: string;
    description: string;
    providerTypes: string[];
    durationWeeks: number;
    rationale: string;
  };
  musculageScore: number;
  crossScanRecommendations: { targetModule: string; reason: string }[];
  gameResults?: Record<string, { percentile: number; interpretation: string }>;
}

export default function ResultsPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResults() {
      const res = await apiClient.get<SessionData>(`/api/cde/scan/${sessionId}`);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error ?? 'Failed to load results');
      }
      setLoading(false);
    }
    fetchResults();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-slate-400 animate-pulse">Loading your results...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">{error ?? 'Results not found'}</p>
          <button onClick={() => window.history.back()} className="mt-4 text-sm text-slate-400 hover:text-slate-200">
            ← Go back
          </button>
        </div>
      </div>
    );
  }

  const { summary, careRecommendation, musculageScore, crossScanRecommendations } = data;

  return (
    <div className="min-h-screen bg-[#020617]">
      <div className="mx-auto max-w-lg px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Your Results</h1>
          <button className="text-sm text-slate-400 hover:text-slate-200">Share</button>
        </div>

        {/* Risk Tier */}
        <div className="mb-4">
          <RiskTierBadge
            tier={summary.riskTier}
            description={`Your responses suggest ${summary.riskTier.toLowerCase()} risk signals`}
          />
        </div>

        {/* Musculage Summary */}
        <div className="mb-4">
          <MusculageSummary
            score={summary.musculageScore ?? musculageScore}
            age={null}
            breakdown={[
              { label: 'BAL', value: summary.parameterScores?.BAL ?? null },
              { label: 'ROM', value: summary.parameterScores?.ROM ?? null },
              { label: 'MOB', value: summary.parameterScores?.MOB ?? null },
              { label: 'REF', value: summary.parameterScores?.REF ?? null },
            ]}
          />
        </div>

        {/* Score Cards */}
        {data.gameResults && Object.keys(data.gameResults).length > 0 && (
          <div className="mb-4">
            <h2 className="mb-3 text-sm font-medium text-slate-400 uppercase tracking-wider">
              Assessment Results
            </h2>
            <div className="space-y-2">
              {Object.entries(data.gameResults).map(([gameId, result]) => (
                <ScoreCard
                  key={gameId}
                  gameId={gameId}
                  parameter={gameId}
                  percentile={result.percentile}
                  interpretation={result.interpretation}
                />
              ))}
            </div>
          </div>
        )}

        {/* Care Recommendation */}
        <div className="mb-4">
          <h2 className="mb-3 text-sm font-medium text-slate-400 uppercase tracking-wider">
            Recommended Care Program
          </h2>
          <CarePathwayCard
            name={careRecommendation.name}
            durationWeeks={careRecommendation.durationWeeks}
            providerTypes={careRecommendation.providerTypes}
            description={careRecommendation.description}
          />
        </div>

        {/* Cross Scan Recommendations */}
        {crossScanRecommendations.length > 0 && (
          <div className="mb-4">
            <h2 className="mb-3 text-sm font-medium text-slate-400 uppercase tracking-wider">
              Also Recommended
            </h2>
            <div className="space-y-2">
              {crossScanRecommendations.map((cs, idx) => (
                <CrossScanCard
                  key={idx}
                  targetModule={cs.targetModule}
                  reason={cs.reason}
                />
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <DisclaimerBanner />
      </div>
    </div>
  );
}
