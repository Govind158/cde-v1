/**
 * Chat Container — Main chat wrapper component
 * Primary interface for the Myo scan chat.
 */

'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useScanStore } from '@/stores/scan-store';
import ChatMessage, { TypingIndicator } from './ChatMessage';
import ChatInput from './ChatInput';
import OptionSelector from './OptionSelector';
import SeveritySlider from './SeveritySlider';
import RedFlagAlert from './RedFlagAlert';
import DisclaimerBanner from '../shared/DisclaimerBanner';
import ProgressBar from '../shared/ProgressBar';

export default function ChatContainer() {
  const router = useRouter();
  const {
    messages,
    isTyping,
    status,
    sessionId,
    activeQuestion,
    currentLayer,
    progressPercent,
    recommendedGames,
    sendMessage,
    submitAnswer,
    skipGames,
    resetScan,
  } = useScanStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Navigate to results page when session finalizes
  useEffect(() => {
    if (status === 'results' && sessionId) {
      router.push(`/app/scan/results/${sessionId}`);
    }
  }, [status, sessionId, router]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Narrow to question output type for safe property access
  const questionOutput = activeQuestion?.type === 'question' ? activeQuestion : null;

  // FIX: Detect slider questions BEFORE checking hasOptions.
  // Slider questions (uiType === 'slider') have options: [] — they must be detected independently
  // so the SeveritySlider renders and the chat input is disabled.
  const isInternalNode = questionOutput?.nextQuestion.id.startsWith('__') ?? false;
  const isSliderQuestion = questionOutput !== null && !isInternalNode && questionOutput.nextQuestion.uiType === 'slider';
  const hasOptions = (questionOutput?.nextQuestion.options?.length ?? 0) > 0;
  const isOptionQuestion = questionOutput !== null && !isInternalNode && hasOptions && !isSliderQuestion;
  // isStructuredQuestion is true for EITHER option questions OR slider questions
  const isStructuredQuestion = isOptionQuestion || isSliderQuestion;

  // Detect assessment completion (sentinel ID or status)
  const isAssessmentComplete =
    status === 'completed' ||
    status === 'results' ||
    questionOutput?.nextQuestion.id === '__complete' ||
    questionOutput?.nextQuestion.id === '__completed';

  // Red flag halt overlay
  const haltOutput = messages.find((m) => m.cdeOutput?.type === 'red_flag_halt')?.cdeOutput;
  if (status === 'halted' && haltOutput?.type === 'red_flag_halt') {
    return (
      <RedFlagAlert
        emergency={haltOutput.emergency}
        onAcknowledge={() => {
          resetScan();
          window.history.back();
        }}
      />
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-[#020617]">
      {/* Header */}
      <div className="shrink-0 border-b border-white/5 bg-[#020617]/90 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => window.history.back()}
            className="text-sm text-slate-400 hover:text-slate-200"
          >
            ← Back
          </button>
          <h1 className="text-sm font-medium text-slate-200">Myo Scan</h1>
          <div className="w-12" />
        </div>
        <ProgressBar percent={progressPercent} currentLayer={currentLayer} />
      </div>

      {/* Disclaimer */}
      {messages.length <= 1 && <DisclaimerBanner />}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto pb-4 pt-2" role="log" aria-live="polite">
        {messages.map((msg, idx) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            isLatest={idx === messages.length - 1}
          />
        ))}

        {/* Structured question inputs (below latest message) */}
        {isOptionQuestion && questionOutput && (
          <OptionSelector
            question={questionOutput.nextQuestion}
            onSubmit={submitAnswer}
            disabled={isTyping}
          />
        )}

        {isSliderQuestion && questionOutput && (
          <SeveritySlider
            question={questionOutput.nextQuestion}
            onSubmit={submitAnswer}
          />
        )}

        {/* Game recommendations panel */}
        {status === 'games' && recommendedGames.length > 0 && !isTyping && (
          <div className="px-4 py-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="mb-1 text-sm font-medium text-slate-200">Recommended Assessments</p>
              <p className="mb-4 text-xs text-slate-400">
                Based on your responses, we recommend these movement assessments:
              </p>
              <div className="mb-4 space-y-2">
                {recommendedGames.map((game) => (
                  <div
                    key={game.gameId}
                    className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3"
                  >
                    <div>
                      <span className="text-sm font-medium text-slate-200">{game.gameId}</span>
                      <span className="ml-2 text-xs text-slate-400">{game.parameter}</span>
                    </div>
                    <span className="text-xs text-slate-500">~{game.estimatedDuration ?? 45}s</span>
                  </div>
                ))}
              </div>
              <button
                onClick={skipGames}
                className="w-full rounded-xl border border-white/20 bg-white/5 py-3 text-sm font-medium text-slate-300 transition-all hover:border-white/30 hover:bg-white/10 active:scale-[0.98]"
              >
                Skip — Use Sample Data
              </button>
            </div>
          </div>
        )}

        {isTyping && <TypingIndicator />}

        {/* Completion actions */}
        {isAssessmentComplete && !isTyping && (
          <div className="px-4 py-3 flex gap-2">
            <button
              onClick={() => { resetScan(); window.history.back(); }}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm text-slate-300 hover:bg-white/10 transition-all"
            >
              Restart Scan
            </button>
            <button
              onClick={() => sendMessage('Can you tell me more about my results?')}
              className="flex-1 rounded-xl border border-blue-500/30 bg-blue-500/10 py-2.5 text-sm text-blue-300 hover:bg-blue-500/20 transition-all"
            >
              Ask a Question
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <ChatInput
        onSend={sendMessage}
        disabled={isTyping || isStructuredQuestion}
        placeholder={
          isSliderQuestion
            ? 'Use the slider above to set your pain level'
            : isOptionQuestion
              ? 'Please select an option above'
              : 'Type your message...'
        }
      />
    </div>
  );
}
