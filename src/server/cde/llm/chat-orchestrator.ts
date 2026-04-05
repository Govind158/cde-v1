/**
 * Chat Orchestrator — Bridge between user messages and CDE engine
 * Manages: User message → LLM extraction → CDE evaluation → LLM formatting → response
 */

import type { CDEOutput, ChatMessage, FactStore, RiskLevel } from '@/types/cde';
import { CDEEngine } from '../engine';
import { callClaude } from './llm-client';
import { buildExtractionPrompt } from './extraction-prompt';
import { buildFormattingPrompt } from './formatting-prompt';
import { parseExtraction } from './extraction-parser';
import { evaluateRedFlags } from '../safety/red-flag-engine';
import { FactStoreManager } from '../engine/fact-store';
import { db } from '@/server/db/client';
import { cdeScanSessions } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

const MAX_CONVERSATION_HISTORY = 20;

interface ProcessMessageResult {
  conversationResponse: string;
  cdeOutput: CDEOutput | null;
  sessionState: {
    currentLayer: number;
    progressPercent: number;
    riskLevel?: RiskLevel;
  };
}

export class ChatOrchestrator {
  /**
   * Process a free-text message from the user.
   */
  static async processMessage(
    sessionId: string,
    userMessage: string
  ): Promise<ProcessMessageResult> {
    // 1. Load session
    const session = await ChatOrchestrator.loadSession(sessionId);
    if (!session) {
      return {
        conversationResponse: "I'm sorry, I couldn't find your session. Please start a new scan.",
        cdeOutput: null,
        sessionState: { currentLayer: 0, progressPercent: 0 },
      };
    }

    const conversationHistory = (session.conversationHistory ?? []) as unknown as ChatMessage[];
    const factStore = FactStoreManager.fromJSON(
      (session.factStore ?? {}) as Record<string, unknown>
    );

    // Tree-active guard: once the CDE tree has fired, reject free-text and tell user to use buttons.
    // Check three independent signals — any one being true means the tree is running:
    //   1. _treeActive: set by CDEEngine.processStructuredInput and processAnswer (most reliable)
    //   2. _cdeHasFired: set by orchestrator itself when it triggered the CDE
    //   3. Direct factStore check: red flags answered (true/false, not null) = tree ran those questions
    const engineFlagActive = !!(factStore.get('_treeActive') as boolean);
    const orchestratorFlagActive = !!(factStore.get('_cdeHasFired') as boolean);
    const redFlagStore = (factStore.getStore().redFlags ?? {}) as Record<string, boolean | null>;
    const hasRedFlagAnswers = Object.values(redFlagStore).some((v) => v === true || v === false);
    const treeIsActive = engineFlagActive || orchestratorFlagActive || hasRedFlagAnswers;
    if (treeIsActive) {
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString(),
      };
      conversationHistory.push(userMsg);
      try {
        await db
          .update(cdeScanSessions)
          .set({ conversationHistory: conversationHistory as unknown as Record<string, unknown>[] })
          .where(eq(cdeScanSessions.id, sessionId));
      } catch {
        // DB unavailable
      }
      return {
        conversationResponse:
          "I appreciate you sharing that! Please use the options shown above to continue your assessment — they help me capture your responses accurately.",
        cdeOutput: null,
        sessionState: {
          currentLayer: session.currentLayer ?? 0,
          progressPercent: 30,
          riskLevel: (factStore.get('riskLevel') as RiskLevel) ?? undefined,
        },
      };
    }

    // Turn limit safety: after 10 user turns, force CDE to fire if minimum data is present
    const turnCount = conversationHistory.filter((m) => m.role === 'user').length;
    const sessionHasFired = !!(factStore.get('_cdeHasFired') as boolean);

    if (turnCount >= 10 && !sessionHasFired) {
      const hasMinimum = factStore.get('bodyRegion') && factStore.get('severity') !== null;
      if (hasMinimum) {
        console.warn(`[SAFETY] Forcing CDE fire after ${turnCount} turns.`);

        // Fill in defaults for missing fields so the engine can proceed
        if (!factStore.get('duration')) {
          factStore.set('duration', 'acute_0_6_weeks');
        }
        const existingAggravating = (factStore.get('aggravatingFactors') as string[]) ?? [];
        if (existingAggravating.length === 0) {
          factStore.set('aggravatingFactors', ['unknown']);
        }
        factStore.set('_cdeHasFired', true);

        try {
          const forcedOutput = await CDEEngine.processStructuredInput(sessionId, factStore.toJSON());
          const isSentinel =
            forcedOutput.type === 'question' && forcedOutput.nextQuestion.id.startsWith('__');

          if (!isSentinel) {
            await db
              .update(cdeScanSessions)
              .set({
                factStore: factStore.toJSON(),
                conversationHistory: conversationHistory as unknown as Record<string, unknown>[],
              })
              .where(eq(cdeScanSessions.id, sessionId));

            return {
              conversationResponse: "I have enough information to begin your assessment.",
              cdeOutput: forcedOutput,
              sessionState: {
                currentLayer: session.currentLayer ?? 0,
                progressPercent: 30,
                riskLevel: (factStore.get('riskLevel') as RiskLevel) ?? undefined,
              },
            };
          }
        } catch {
          // Safety net failed — fall through to normal processing
        }
      }
    }

    // 2. Add user message to history
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    conversationHistory.push(userMsg);

    // 3. Build LLM messages (trim to last N)
    const llmMessages = conversationHistory
      .slice(-MAX_CONVERSATION_HISTORY)
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
      .filter((m) => m.role === 'user' || m.role === 'assistant');

    // 4. Call Claude for extraction
    let conversationResponse: string;
    let extraction: Partial<FactStore> = {};
    let cdeReady = false;

    try {
      const llmResponse = await callClaude(buildExtractionPrompt(factStore.toJSON()), llmMessages);
      const parsed = parseExtraction(llmResponse);
      conversationResponse = parsed.conversationResponse;
      extraction = parsed.extraction;
      cdeReady = parsed.cdeReady;
    } catch {
      // LLM unavailable — provide a fallback response
      conversationResponse =
        "I understand you're telling me about your concern. Could you describe where exactly you're feeling discomfort and rate your pain from 0 to 10?";
    }

    // 5. Update fact store with extraction
    if (Object.keys(extraction).length > 0) {
      factStore.update(extraction);
    }

    // 6. Red flag check on extracted data
    const rfResult = evaluateRedFlags(factStore.getStore());
    let cdeOutput: CDEOutput | null = null;

    if (rfResult.triggered) {
      const flag = rfResult.flags[0];
      cdeOutput = {
        type: 'red_flag_halt',
        emergency: {
          flagId: flag.flagId,
          urgency: flag.urgency,
          message: flag.haltMessage,
          action: flag.haltAction,
        },
        auditEntry: {
          sessionId,
          timestamp: new Date().toISOString(),
          eventType: 'red_flag_halt',
          factsEvaluated: extraction as Record<string, unknown>,
          ruleFired: true,
          output: { flagId: flag.flagId },
          engineVersion: '1.0.0',
          treeVersion: '1.0.0',
        },
      };

      // Update session as halted
      try {
        await db
          .update(cdeScanSessions)
          .set({
            status: 'halted',
            haltedAt: new Date(),
            haltReason: `Red flag: ${flag.flagId}`,
          })
          .where(eq(cdeScanSessions.id, sessionId));
      } catch {
        // DB unavailable
      }
    }

    // 6b. Severity ceiling (non-halting — store flag for care matcher)
    if (rfResult.severityCeiling && !rfResult.triggered) {
      factStore.set('severityCeilingTriggered', true);
      factStore.set('severityCeilingMessage', rfResult.severityCeilingMessage);
    }

    // 7. If CDE ready (LLM OR engine check) and no red flags, try to advance CDE
    const llmSaysReady = cdeReady;
    const engineSaysReady = factStore.isCDEReady();
    if (llmSaysReady !== engineSaysReady) {
      console.warn(`[cdeReady mismatch] LLM: ${llmSaysReady}, Engine: ${engineSaysReady}. Using: ${llmSaysReady || engineSaysReady}`);
    }

    if ((llmSaysReady || engineSaysReady) && !rfResult.triggered) {
      // Mark tree as active so future free-text messages are redirected to buttons
      factStore.set('_cdeHasFired', true);
      try {
        const rawOutput = await CDEEngine.processStructuredInput(sessionId, extraction);

        // Detect completion sentinel — tree has finished all questions
        if (rawOutput.type === 'question' && rawOutput.nextQuestion.id.startsWith('__')) {
          // Finalize the session and build a care_recommendation output
          const finalResult = await CDEEngine.completeSession(sessionId);
          const care = finalResult.careRecommendation ?? {
            pathwayId: 'cp_guided_general',
            name: 'Guided Recovery Program',
            description: 'A personalised program based on your assessment results.',
            providerTypes: ['Physiotherapist'],
            durationWeeks: 8,
            rationale: 'Based on your reported symptoms and risk profile.',
            alternatives: [],
          };
          cdeOutput = {
            type: 'care_recommendation',
            care,
            auditEntry: {
              sessionId,
              timestamp: new Date().toISOString(),
              eventType: 'assessment_completed',
              factsEvaluated: {},
              ruleFired: true,
              output: finalResult.summary,
              engineVersion: '1.0.0',
              treeVersion: '1.0.0',
            },
          };
        } else {
          cdeOutput = rawOutput;
        }
      } catch {
        // CDE processing failed — continue conversation
      }
    }

    // 7b. If CDE returned game recommendations, update session status to 'games'
    if (cdeOutput && cdeOutput.type === 'game_recommendation') {
      try {
        await db
          .update(cdeScanSessions)
          .set({ status: 'games' })
          .where(eq(cdeScanSessions.id, sessionId));
      } catch {
        // DB unavailable
      }
    }

    // 8. Format CDE output if present (non-halt, non-question outputs)
    if (cdeOutput && cdeOutput.type !== 'red_flag_halt' && cdeOutput.type !== 'question') {
      try {
        const formattingPrompt = buildFormattingPrompt(cdeOutput.type, {
          age: factStore.get('age') as number | null,
          sex: factStore.get('sex') as 'male' | 'female' | 'other' | null,
          activityLevel: factStore.get('activityLevel') as string | null,
          userGoals: (factStore.get('userGoals') as string[]) ?? [],
          riskLevel: (factStore.get('riskLevel') as RiskLevel) ?? null,
          severityCeiling: (factStore.get('severityCeilingTriggered') as boolean) ?? false,
        });
        const formatted = await callClaude(formattingPrompt, [
          {
            role: 'user',
            content: `Format this CDE output for the user:\n${JSON.stringify(cdeOutput)}`,
          },
        ]);
        conversationResponse = formatted;
      } catch {
        // Formatting failed — use raw conversation response
      }
    }

    // 9. Add assistant response to history
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: conversationResponse,
      timestamp: new Date().toISOString(),
      cdeOutput: cdeOutput ?? undefined,
      structuredExtraction: Object.keys(extraction).length > 0 ? extraction : undefined,
    };
    conversationHistory.push(assistantMsg);

    // 10. Save session
    try {
      await db
        .update(cdeScanSessions)
        .set({
          factStore: factStore.toJSON(),
          conversationHistory: conversationHistory as unknown as Record<string, unknown>[],
          currentLayer: session.currentLayer,
        })
        .where(eq(cdeScanSessions.id, sessionId));
    } catch {
      // DB unavailable
    }

    return {
      conversationResponse,
      cdeOutput,
      sessionState: {
        currentLayer: session.currentLayer ?? 0,
        progressPercent: cdeReady ? 25 : 10,
        riskLevel: (factStore.get('riskLevel') as RiskLevel) ?? undefined,
      },
    };
  }

  /**
   * Process a game result submitted from the game player UI.
   * Returns a formatted interpretation and indicates whether more games remain.
   */
  static async processGameResult(
    sessionId: string,
    gameId: string,
    rawScore: number,
    subScores?: { left?: number; right?: number },
    durationSeconds: number = 0
  ): Promise<ProcessMessageResult> {
    const session = await ChatOrchestrator.loadSession(sessionId);
    if (!session) {
      return {
        conversationResponse: "I'm sorry, I couldn't find your session.",
        cdeOutput: null,
        sessionState: { currentLayer: 0, progressPercent: 0 },
      };
    }

    const factStore = FactStoreManager.fromJSON(
      (session.factStore ?? {}) as Record<string, unknown>
    );

    // Delegate to the engine's full pipeline
    const result = await CDEEngine.processGameResult(
      sessionId,
      gameId,
      rawScore,
      subScores,
      durationSeconds
    );

    const interpretation = result.interpretation as Record<string, unknown>;
    let conversationResponse: string;
    let cdeOutput: CDEOutput | null = null;

    if (result.careReady) {
      // All games complete — finalize the session
      const finalResult = await CDEEngine.completeSession(sessionId);
      const care = finalResult.careRecommendation ?? {
        pathwayId: 'cp_guided_general',
        name: 'Guided Recovery Program',
        description: 'A personalised program based on your assessment results.',
        providerTypes: ['Physiotherapist'],
        durationWeeks: 8,
        rationale: 'Based on your reported symptoms and risk profile.',
        alternatives: [],
      };

      cdeOutput = {
        type: 'care_recommendation',
        care,
        auditEntry: {
          sessionId,
          timestamp: new Date().toISOString(),
          eventType: 'assessment_completed',
          factsEvaluated: {},
          ruleFired: true,
          output: finalResult.summary,
          engineVersion: '1.0.0',
          treeVersion: '1.0.0',
        },
      };

      // Format the care recommendation with patient context
      try {
        const formattingPrompt = buildFormattingPrompt('care_recommendation', {
          age: factStore.get('age') as number | null,
          sex: factStore.get('sex') as 'male' | 'female' | 'other' | null,
          activityLevel: factStore.get('activityLevel') as string | null,
          userGoals: (factStore.get('userGoals') as string[]) ?? [],
          riskLevel: (factStore.get('riskLevel') as RiskLevel) ?? null,
          severityCeiling: (factStore.get('severityCeilingTriggered') as boolean) ?? false,
        });
        conversationResponse = await callClaude(formattingPrompt, [
          {
            role: 'user',
            content: `Format this care recommendation for the user:\n${JSON.stringify(cdeOutput)}`,
          },
        ]);
      } catch {
        conversationResponse =
          `Great news — your assessment is complete! Based on your results, we recommend the ${care.name} program (${care.durationWeeks} weeks). ${care.rationale}`;
      }
    } else if (result.nextGame) {
      // More games to play — format the interpretation and present the next game
      const patientSummary = (interpretation.patientFacingSummary as string) ?? 'Assessment recorded.';
      const nextGameName = result.nextGame.parameterDisplayName ?? result.nextGame.gameId;

      conversationResponse = `${patientSummary}\n\nNext up: **${nextGameName}** — ${result.nextGame.purpose}`;

      cdeOutput = {
        type: 'game_recommendation',
        games: [result.nextGame],
        auditEntry: {
          sessionId,
          timestamp: new Date().toISOString(),
          eventType: 'next_game',
          factsEvaluated: { completedGame: gameId },
          ruleFired: true,
          output: { nextGame: result.nextGame.gameId },
          engineVersion: '1.0.0',
          treeVersion: '1.0.0',
        },
      };
    } else {
      // Edge case: no next game but not care-ready (shouldn't happen normally)
      conversationResponse = (interpretation.patientFacingSummary as string) ?? 'Assessment recorded.';
    }

    return {
      conversationResponse,
      cdeOutput,
      sessionState: {
        currentLayer: session.currentLayer ?? 0,
        progressPercent: result.careReady ? 100 : 75,
        riskLevel: (factStore.get('riskLevel') as RiskLevel) ?? undefined,
      },
    };
  }

  private static async loadSession(sessionId: string) {
    try {
      return await db.query.cdeScanSessions.findFirst({
        where: eq(cdeScanSessions.id, sessionId),
      });
    } catch {
      return null;
    }
  }
}
