/**
 * Scan Entry Page — Where users choose what type of scan to start
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useScanStore } from '@/stores/scan-store';
import DisclaimerBanner from '@/components/cde/shared/DisclaimerBanner';

const CONDITIONS = [
  { id: 'osteoarthritis', label: 'Osteoarthritis' },
  { id: 'sciatica', label: 'Sciatica' },
  { id: 'disc_bulge', label: 'Disc Bulge' },
  { id: 'spondylosis', label: 'Spondylosis' },
  { id: 'osteoporosis', label: 'Osteoporosis' },
  { id: 'rheumatoid_arthritis', label: 'Rheumatoid Arthritis' },
  { id: 'rotator_cuff', label: 'Rotator Cuff' },
];

export default function ScanPage() {
  const router = useRouter();
  const { startScan, startChatFirst } = useScanStore();
  const [showConditions, setShowConditions] = useState(false);

  const handleChatFirstScan = async () => {
    await startChatFirst();
    const sessionId = useScanStore.getState().sessionId;
    if (sessionId) router.push(`/app/scan/${sessionId}`);
  };

  const handleConditionScan = async (condition: string) => {
    await startScan('condition', undefined, condition);
    const sessionId = useScanStore.getState().sessionId;
    if (sessionId) router.push(`/app/scan/${sessionId}`);
  };

  const handleWellnessScan = async () => {
    await startScan('wellness');
    const sessionId = useScanStore.getState().sessionId;
    if (sessionId) router.push(`/app/scan/${sessionId}`);
  };

  if (showConditions) {
    return (
      <div className="min-h-screen bg-[#020617] px-4 py-8">
        <button onClick={() => setShowConditions(false)} className="mb-4 text-sm text-slate-400 hover:text-slate-200">
          ← Back
        </button>
        <h2 className="mb-4 text-lg font-semibold text-slate-200">Select your condition</h2>
        <div className="space-y-2">
          {CONDITIONS.map((condition) => (
            <button
              key={condition.id}
              onClick={() => handleConditionScan(condition.id)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-slate-200 transition-all hover:bg-white/10 hover:border-blue-500/30"
            >
              {condition.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617]">
      <div className="mx-auto max-w-md px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Myo Health Scan</h1>
          <p className="mt-2 text-sm text-slate-400">Understand your body better</p>
        </div>

        {/* Entry cards */}
        <div className="space-y-3">
          {/* Pain/Discomfort */}
          <button
            onClick={handleChatFirstScan}
            className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition-all hover:bg-white/10 hover:border-blue-500/20 animate-fade-in-up"
            style={{ animationDelay: '0ms' }}
          >
            <div className="mb-2 text-2xl">&#129506;</div>
            <h2 className="text-base font-semibold text-slate-200">
              I have pain or discomfort
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Tell us where it hurts — we&apos;ll assess your condition
            </p>
          </button>

          {/* Condition */}
          <button
            onClick={() => setShowConditions(true)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition-all hover:bg-white/10 hover:border-blue-500/20 animate-fade-in-up"
            style={{ animationDelay: '100ms' }}
          >
            <div className="mb-2 text-2xl">&#128203;</div>
            <h2 className="text-base font-semibold text-slate-200">
              I have a condition
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Been diagnosed? We&apos;ll check what it means for you
            </p>
          </button>

          {/* Wellness */}
          <button
            onClick={handleWellnessScan}
            className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition-all hover:bg-white/10 hover:border-blue-500/20 animate-fade-in-up"
            style={{ animationDelay: '200ms' }}
          >
            <div className="mb-2 text-2xl">&#127939;</div>
            <h2 className="text-base font-semibold text-slate-200">
              Check my movement health
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              No pain? Great — let&apos;s benchmark your body
            </p>
            <span className="mt-2 inline-block rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-300">
              Musculage Score
            </span>
          </button>
        </div>

        {/* Scan history link */}
        <div className="mt-8 text-center">
          <button className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
            View your scan history
          </button>
        </div>

        {/* Disclaimer */}
        <div className="mt-4">
          <DisclaimerBanner />
        </div>
      </div>
    </div>
  );
}
