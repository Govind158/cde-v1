/**
 * Chat Message — Single message bubble component
 * Handles user, assistant, and CDE output embedded messages.
 */

'use client';

import type { ChatMessage as ChatMessageType, CDEOutput } from '@/types/cde';

interface ChatMessageProps {
  message: ChatMessageType;
  isLatest: boolean;
}

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
}

function ScoreInterpretationCard({ output }: { output: CDEOutput }) {
  if (output.type !== 'score_interpretation') return null;
  const { interpretation } = output;
  const colorMap: Record<string, string> = {
    poor: 'text-red-400 border-red-500/30 bg-red-500/10',
    below_average: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    fair: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    good: 'text-teal-400 border-teal-500/30 bg-teal-500/10',
    excellent: 'text-green-400 border-green-500/30 bg-green-500/10',
  };
  const colorClass = colorMap[interpretation.band] ?? colorMap['fair'];

  return (
    <div className={`mt-3 rounded-xl border p-3 ${colorClass} animate-scale-in`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{interpretation.gameId}</span>
        <span className="text-lg font-bold">{interpretation.percentile}</span>
      </div>
      <p className="mt-1 text-xs text-slate-300">{interpretation.patientSummary}</p>
      {interpretation.trend && (
        <span className="mt-1 inline-block text-xs">
          {interpretation.trend === 'improved' ? '↑ Improved' : interpretation.trend === 'declined' ? '↓ Declined' : '→ Stable'}
        </span>
      )}
    </div>
  );
}

function CareRecommendationCard({ output }: { output: CDEOutput }) {
  if (output.type !== 'care_recommendation') return null;
  const { care } = output;

  return (
    <div className="mt-3 rounded-xl border border-green-500/20 bg-green-500/5 p-3">
      <h4 className="text-sm font-medium text-green-300">{care.name}</h4>
      <p className="mt-1 text-xs text-slate-400">
        {care.durationWeeks} weeks &middot; {care.providerTypes.join(', ')}
      </p>
      <p className="mt-2 text-xs text-slate-300">{care.description}</p>
    </div>
  );
}

function CrossScanCard({ output }: { output: CDEOutput }) {
  if (output.type !== 'cross_scan') return null;
  const { crossScan } = output;

  return (
    <div className="mt-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
      <p className="text-xs text-cyan-300">{crossScan.reason}</p>
      <button className="mt-2 text-xs font-medium text-cyan-400 hover:text-cyan-300">
        Start {crossScan.targetModule} Assessment →
      </button>
    </div>
  );
}

function RiskTierBadge({ output }: { output: CDEOutput }) {
  if (output.type !== 'game_recommendation') return null;
  return null; // Risk tier shown in results page
}

export default function ChatMessage({ message, isLatest }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const animClass = isLatest ? 'animate-fade-in-up' : '';

  if (isUser) {
    return (
      <div className={`flex justify-end px-4 py-1 ${animClass}`}>
        <div
          className="max-w-[80%] rounded-2xl rounded-br-sm px-4 py-2.5"
          style={{
            background: 'rgba(59,130,246,0.15)',
            border: '1px solid rgba(59,130,246,0.2)',
          }}
        >
          <p
            className="text-sm text-slate-100"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
          />
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className={`flex justify-start px-4 py-1 ${animClass}`}>
      <div className="max-w-[85%]">
        <span className="mb-1 block text-[10px] font-medium text-slate-500">Myo</span>
        <div
          className="rounded-2xl rounded-bl-sm px-4 py-2.5"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <p
            className="text-sm text-slate-200"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
          />

          {/* Embedded CDE outputs */}
          {message.cdeOutput?.type === 'score_interpretation' && (
            <ScoreInterpretationCard output={message.cdeOutput} />
          )}
          {message.cdeOutput?.type === 'care_recommendation' && (
            <CareRecommendationCard output={message.cdeOutput} />
          )}
          {message.cdeOutput?.type === 'cross_scan' && (
            <CrossScanCard output={message.cdeOutput} />
          )}
        </div>
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex justify-start px-4 py-1 animate-fade-in-up">
      <div className="max-w-[85%]">
        <span className="mb-1 block text-[10px] font-medium text-slate-500">Myo</span>
        <div
          className="rounded-2xl rounded-bl-sm px-4 py-3"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex gap-1.5">
            <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
