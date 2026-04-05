/**
 * Scan Store — Zustand store for active scan session
 */

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ChatMessage,
  CDEOutput,
  RiskLevel,
  GameScoreEntry,
  GameRecommendation,
} from '@/types/cde';
import { apiClient } from '@/lib/api-client';

interface ScanState {
  // Session
  sessionId: string | null;
  sessionType: 'location' | 'condition' | 'wellness' | null;
  status: 'idle' | 'active' | 'halted' | 'games' | 'results' | 'completed';

  // Conversation
  messages: ChatMessage[];
  isTyping: boolean;

  // CDE state
  currentLayer: number;
  progressPercent: number;
  riskLevel: RiskLevel | null;
  activeQuestion: CDEOutput | null;

  // Game state
  recommendedGames: GameRecommendation[];
  currentGameIndex: number;
  gameResults: GameScoreEntry[];

  // Results
  results: {
    summary: Record<string, unknown>;
    careRecommendation: Record<string, unknown>;
    musculageScore: number;
    crossScans: Record<string, unknown>[];
  } | null;

  // Actions
  startScan: (
    entryType: 'location' | 'condition' | 'wellness',
    bodyRegion?: string,
    condition?: string
  ) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  submitAnswer: (questionId: string, answer: string | string[]) => Promise<void>;
  submitGameResult: (
    gameId: string,
    rawScore: number,
    subScores?: { left?: number; right?: number },
    duration?: number
  ) => Promise<void>;
  skipGames: () => Promise<void>;
  completeScan: () => Promise<void>;
  resetScan: () => void;
}

const initialState = {
  sessionId: null,
  sessionType: null,
  status: 'idle' as const,
  messages: [],
  isTyping: false,
  currentLayer: 0,
  progressPercent: 0,
  riskLevel: null,
  activeQuestion: null,
  recommendedGames: [],
  currentGameIndex: 0,
  gameResults: [],
  results: null,
};

export const useScanStore = create<ScanState>()(
  persist(
    (set, get) => ({
      ...initialState,

      startScan: async (entryType, bodyRegion?, condition?) => {
        set({ status: 'active', sessionType: entryType, messages: [], isTyping: true });

        const res = await apiClient.post<{
          sessionId: string;
          firstOutput: CDEOutput;
          disclaimers: { standard: string };
        }>('/api/cde/scan/start', { entryType, bodyRegion, condition });

        if (res.success && res.data) {
          const { sessionId, firstOutput } = res.data;

          const welcomeMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: "Welcome to your Myo Health Scan. I'll guide you through a quick assessment.",
            timestamp: new Date().toISOString(),
            cdeOutput: firstOutput,
          };

          set({
            sessionId,
            isTyping: false,
            messages: [welcomeMsg],
            activeQuestion: firstOutput.type === 'question' ? firstOutput : null,
          });
        } else {
          set({ isTyping: false, status: 'idle' });
        }
      },

      sendMessage: async (message) => {
        const { sessionId, messages } = get();
        if (!sessionId) return;

        const userMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          content: message,
          timestamp: new Date().toISOString(),
        };

        set({ messages: [...messages, userMsg], isTyping: true });

        const res = await apiClient.post<{
          conversationResponse: string;
          cdeOutput?: CDEOutput;
          sessionState: { currentLayer: number; progressPercent: number; riskLevel?: RiskLevel };
        }>('/api/cde/scan/message', { sessionId, message });

        if (res.success && res.data) {
          const assistantMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: res.data.conversationResponse,
            timestamp: new Date().toISOString(),
            cdeOutput: res.data.cdeOutput,
          };

          const newState: Partial<ScanState> = {
            messages: [...get().messages, assistantMsg],
            isTyping: false,
            currentLayer: res.data.sessionState.currentLayer,
            progressPercent: res.data.sessionState.progressPercent,
          };

          if (res.data.sessionState.riskLevel) {
            newState.riskLevel = res.data.sessionState.riskLevel;
          }

          const cdeOut = res.data.cdeOutput;
          if (cdeOut?.type === 'question') {
            // Internal sentinel means the tree is done — trigger finalization
            if (cdeOut.nextQuestion.id.startsWith('__')) {
              newState.status = 'results';
              newState.activeQuestion = null;
            } else {
              newState.activeQuestion = cdeOut;
            }
          } else if (cdeOut?.type === 'red_flag_halt') {
            newState.status = 'halted';
            newState.activeQuestion = null;
          } else if (cdeOut?.type === 'care_recommendation') {
            newState.status = 'results';
            newState.activeQuestion = null;
          } else if (cdeOut?.type === 'game_recommendation') {
            newState.status = 'games';
            newState.recommendedGames = cdeOut.games;
            newState.currentGameIndex = 0;
            newState.activeQuestion = null;
          } else {
            newState.activeQuestion = null;
          }

          set(newState);
        } else {
          set({ isTyping: false });
        }
      },

      submitAnswer: async (questionId, answer) => {
        const { sessionId, messages } = get();
        if (!sessionId) return;

        const answerText = Array.isArray(answer) ? answer.join(', ') : answer;
        const userMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          content: answerText,
          timestamp: new Date().toISOString(),
        };

        set({ messages: [...messages, userMsg], isTyping: true, activeQuestion: null });

        const res = await apiClient.post<{
          cdeOutput: CDEOutput;
          sessionState: { currentLayer: number; progressPercent: number };
        }>('/api/cde/scan/answer', { sessionId, questionId, answer });

        if (res.success && res.data) {
          const { cdeOutput } = res.data;

          const isCompleteSentinel =
            cdeOutput.type === 'question' && cdeOutput.nextQuestion.id.startsWith('__');

          const assistantMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content:
              isCompleteSentinel
                ? "Your assessment is complete. Let me prepare your results."
                : cdeOutput.type === 'question'
                  ? cdeOutput.nextQuestion.text
                  : cdeOutput.type === 'red_flag_halt'
                    ? cdeOutput.emergency.message
                    : cdeOutput.type === 'game_recommendation'
                      ? "Great, we've completed the questionnaire. Now let's do some quick movement assessments."
                      : 'Processing...',
            timestamp: new Date().toISOString(),
            cdeOutput,
          };

          const newState: Partial<ScanState> = {
            messages: [...get().messages, assistantMsg],
            isTyping: false,
          };

          if (cdeOutput.type === 'red_flag_halt') {
            newState.status = 'halted';
          } else if (isCompleteSentinel) {
            newState.status = 'results';
            newState.activeQuestion = null;
          } else if (cdeOutput.type === 'question') {
            newState.activeQuestion = cdeOutput;
          } else if (cdeOutput.type === 'game_recommendation') {
            newState.status = 'games';
            newState.recommendedGames = cdeOutput.games;
            newState.currentGameIndex = 0;
          }

          set(newState);
        } else {
          set({ isTyping: false });
        }
      },

      submitGameResult: async (gameId, rawScore, subScores?, duration = 60) => {
        const { sessionId } = get();
        if (!sessionId) return;

        const res = await apiClient.post<{
          interpretation: Record<string, unknown>;
          nextGame?: GameRecommendation;
          remainingGames: number;
          careReady: boolean;
        }>('/api/cde/scan/game-result', {
          sessionId,
          gameId,
          rawScore,
          subScores,
          durationSeconds: duration,
          qualityFlag: 'valid',
        });

        if (res.success && res.data) {
          const { gameResults, currentGameIndex } = get();
          const entry: GameScoreEntry = {
            rawScore,
            percentile: (res.data.interpretation as any).percentile ?? 50,
            band: (res.data.interpretation as any).band ?? '25_to_75',
            interpretation: (res.data.interpretation as any).interpretation ?? '',
          };

          set({
            gameResults: [...gameResults, entry],
            currentGameIndex: currentGameIndex + 1,
          });

          if (res.data.careReady) {
            set({ status: 'results' });
          }
        }
      },

      skipGames: async () => {
        const { sessionId, recommendedGames } = get();
        if (!sessionId) return;

        const dummyScores: Record<string, { raw: number; left?: number; right?: number }> = {
          BB1: { raw: 65, left: 62, right: 68 }, BB2: { raw: 58, left: 55, right: 61 },
          BB3: { raw: 45, left: 42, right: 48 }, BB4: { raw: 52 },
          NN1: { raw: 48 }, NN2: { raw: 42, left: 40, right: 44 },
          NN3: { raw: 55, left: 52, right: 58 }, NN4: { raw: 60, left: 58, right: 62 },
          NN5: { raw: 38 }, FA1: { raw: 72 }, FA2: { raw: 45, left: 42, right: 48 },
          FA3: { raw: 55, left: 52, right: 58 }, FA4: { raw: 22 }, FA5: { raw: 50 },
          KS1: { raw: 450, left: 440, right: 460 }, KS2: { raw: 62, left: 60, right: 64 },
          KS3: { raw: 55, left: 52, right: 58 },
        };

        for (const game of recommendedGames) {
          const dummy = dummyScores[game.gameId] ?? { raw: 50 };
          await apiClient.post('/api/cde/scan/game-result', {
            sessionId,
            gameId: game.gameId,
            rawScore: dummy.raw,
            subScores: dummy.left !== undefined ? { left: dummy.left, right: dummy.right } : undefined,
            durationSeconds: 45,
            qualityFlag: 'valid',
          });
        }

        set({ status: 'results' });
      },

      completeScan: async () => {
        const { sessionId } = get();
        if (!sessionId) return;

        const res = await apiClient.post<{
          summary: Record<string, unknown>;
          careRecommendation: Record<string, unknown>;
          musculageScore: number;
          crossScanRecommendations: Record<string, unknown>[];
        }>('/api/cde/scan/complete', { sessionId });

        if (res.success && res.data) {
          set({
            status: 'completed',
            results: {
              summary: res.data.summary,
              careRecommendation: res.data.careRecommendation,
              musculageScore: res.data.musculageScore,
              crossScans: res.data.crossScanRecommendations,
            },
          });
        }
      },

      resetScan: () => {
        set(initialState);
      },
    }),
    {
      name: 'kriya-scan-store',
      partialize: (state) => ({
        sessionId: state.sessionId,
        messages: state.messages,
        status: state.status,
        results: state.results,
      }),
    }
  )
);
