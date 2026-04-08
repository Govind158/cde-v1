/**
 * CDE Engine Orchestrator — Main entry point
 * Ties together FactStore, RedFlagEngine, TreeWalker, AuditLogger.
 * Exposes a clean API that the API routes call.
 */

import type {
  CDEOutput,
  FactStore,
  ScanSession,
  CrossScanTag,
  DecisionTree,
  GameScoreEntry,
  CareRecommendationData,
  GameRecommendation,
} from '@/types/cde';
import { createDefaultFactStore } from '@/types/cde';
import { FactStoreManager } from './fact-store';
import { TreeWalker } from './tree-walker';
import { AuditLogger } from './audit-logger';
import { evaluateRedFlags } from '../safety/red-flag-engine';
import { computeRiskBreakdown } from './risk-stratifier';
import { interpretGameResult } from '../interpreter/score-interpreter';
import { recommendGames } from '../interpreter/game-recommender';
import { matchCarePathway } from '../interpreter/care-matcher';
import { getTreeIdForRegion } from '../ontology/body-regions';
import { loadTree } from '../trees/tree-loader';
import { db } from '@/server/db/client';
import { cdeScanSessions, cdeAuditLog } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

export const CDE_ENGINE_VERSION = '1.0.0';

/** In-memory walker cache with TTL eviction */
interface CachedWalker {
  walker: TreeWalker;
  createdAt: number;
}
const walkerCache = new Map<string, CachedWalker>();
const WALKER_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCachedWalker(sessionId: string): TreeWalker | null {
  const entry = walkerCache.get(sessionId);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > WALKER_CACHE_TTL) {
    walkerCache.delete(sessionId);
    return null;
  }
  return entry.walker;
}

function setCachedWalker(sessionId: string, walker: TreeWalker): void {
  walkerCache.set(sessionId, { walker, createdAt: Date.now() });
}

// Periodic cleanup of expired walker cache entries (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of walkerCache.entries()) {
      if (now - entry.createdAt > WALKER_CACHE_TTL) {
        walkerCache.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export class CDEEngine {
  /**
   * Start a new scan session.
   */
  static async startSession(params: {
    userId?: string;
    entryType: 'location' | 'condition' | 'wellness';
    bodyRegion?: string;
    condition?: string;
    prePopulatedFrom?: { sessionId: string; tags: CrossScanTag[] };
  }): Promise<{ sessionId: string; firstOutput: CDEOutput }> {
    // Select the appropriate decision tree — try ontology first, then string fallback
    let treeId = params.bodyRegion ? getTreeIdForRegion(params.bodyRegion) : null;

    if (!treeId) {
      treeId = params.condition
        ? `DT_${params.condition.toUpperCase().replace(/\s+/g, '_')}`
        : params.bodyRegion
          ? `DT_${params.bodyRegion.toUpperCase().replace(/\s+/g, '_')}`
          : 'DT_WELLNESS';
    }

    // Load tree via tree-loader (DB → JSON file → fallback)
    let tree: DecisionTree;
    try {
      tree = await loadTree(treeId);
    } catch {
      // Tree not found — use minimal fallback
      tree = CDEEngine.createMinimalTree(treeId);
    }

    // Initialize fact store
    const initialFacts: Partial<FactStore> = {};
    if (params.bodyRegion) initialFacts.bodyRegion = params.bodyRegion;
    if (params.condition) initialFacts.conditionMentioned = params.condition;

    // Apply pre-populated data from cross-scan
    if (params.prePopulatedFrom?.tags) {
      for (const tag of params.prePopulatedFrom.tags) {
        Object.assign(initialFacts, tag.data);
      }
    }

    const factStore = new FactStoreManager(initialFacts);
    // Mark tree as active so ChatOrchestrator's processMessage guard blocks free-text LLM
    // extraction during structured question flow.
    factStore.set('_treeActive', true);
    const walker = new TreeWalker(tree, factStore);

    // Create database record
    let sessionId: string;
    try {
      const [session] = await db
        .insert(cdeScanSessions)
        .values({
          userId: params.userId ?? null,
          sessionType: params.entryType,
          decisionTreeId: tree.id,
          decisionTreeVersion: tree.version,
          status: 'active',
          currentLayer: 0,
          factStore: factStore.toJSON(),
          engineVersion: CDE_ENGINE_VERSION,
          prePopulatedFrom: params.prePopulatedFrom
            ? { sessionId: params.prePopulatedFrom.sessionId, tags: params.prePopulatedFrom.tags }
            : null,
          conversationHistory: [],
          layerScores: {},
          conditionTags: [],
        })
        .returning();
      sessionId = session.id;
    } catch {
      // Database not available — generate local ID
      sessionId = crypto.randomUUID();
    }

    // Cache walker
    setCachedWalker(sessionId, walker);

    // Get first output (first Layer 0 question)
    const firstOutput = walker.evaluateCurrentNode();

    return { sessionId, firstOutput };
  }

  /**
   * Start a PRE_TREE session — no tree loaded, no questions yet.
   * The user will type their first message and LLM extracts bodyRegion before the tree fires.
   */
  static async startPreTreeSession(params: {
    userId?: string;
  }): Promise<{ sessionId: string; prompt: string }> {
    let sessionId: string;
    try {
      const [session] = await db
        .insert(cdeScanSessions)
        .values({
          userId: params.userId ?? null,
          sessionType: 'location',
          decisionTreeId: 'DT_PENDING',
          decisionTreeVersion: '0.0.0',
          status: 'pre_tree',
          currentLayer: 0,
          factStore: createDefaultFactStore() as unknown as Record<string, unknown>,
          engineVersion: CDE_ENGINE_VERSION,
          prePopulatedFrom: null,
          conversationHistory: [],
          layerScores: {},
          conditionTags: [],
        })
        .returning();
      sessionId = session.id;
    } catch {
      sessionId = crypto.randomUUID();
    }

    return {
      sessionId,
      prompt: "Hi! I'm Myo, your musculoskeletal health assistant. What's been bothering you? Tell me in your own words.",
    };
  }

  /**
   * Activate a tree for a PRE_TREE session once bodyRegion has been extracted.
   * Loads the correct tree, initialises TreeWalker, updates session status to 'active',
   * and returns the first red-flag screening question.
   */
  static async activateTree(
    sessionId: string,
    bodyRegion: string,
    intent: string
  ): Promise<CDEOutput> {
    // Resolve tree ID from bodyRegion
    let treeId = getTreeIdForRegion(bodyRegion);
    if (!treeId) {
      treeId = `DT_${bodyRegion.toUpperCase().replace(/\s+/g, '_')}`;
    }

    // Load tree
    let tree: DecisionTree;
    try {
      tree = await loadTree(treeId);
    } catch {
      tree = CDEEngine.createMinimalTree(treeId);
    }

    // Load existing factStore from DB (has bodyRegion + intent already written by orchestrator)
    let factStore: FactStoreManager;
    try {
      const session = await db.query.cdeScanSessions.findFirst({
        where: eq(cdeScanSessions.id, sessionId),
      });
      factStore = session
        ? FactStoreManager.fromJSON((session.factStore ?? {}) as Record<string, unknown>)
        : new FactStoreManager({ bodyRegion, intent } as Partial<FactStore>);
    } catch {
      factStore = new FactStoreManager({ bodyRegion, intent } as Partial<FactStore>);
    }

    // Ensure bodyRegion is set (may have been written already by orchestrator)
    if (!factStore.get('bodyRegion')) {
      factStore.set('bodyRegion', bodyRegion);
    }

    // Create walker and cache it
    const walker = new TreeWalker(tree, factStore);
    // Mark tree as active BEFORE persisting factStore to DB so the guard in
    // ChatOrchestrator.processMessage() sees it on the very first message after tree activation.
    factStore.set('_treeActive', true);
    setCachedWalker(sessionId, walker);

    // Update DB: real tree ID + status active
    try {
      await db
        .update(cdeScanSessions)
        .set({
          decisionTreeId: tree.id,
          decisionTreeVersion: tree.version,
          status: 'active',
          factStore: factStore.toJSON(),
        })
        .where(eq(cdeScanSessions.id, sessionId));
    } catch {
      // DB unavailable
    }

    // Audit: log tree activation event
    const auditLogger = new AuditLogger(sessionId, CDE_ENGINE_VERSION, tree.version);
    auditLogger.setFlushFunction(async (entries) => {
      try {
        if (entries.length > 0) {
          await db.insert(cdeAuditLog).values(
            entries.map((e) => ({
              sessionId,
              eventType: e.eventType,
              layer: e.layer ?? null,
              nodeId: e.nodeId ?? null,
              ruleId: e.ruleId ?? null,
              factsEvaluated: e.factsEvaluated,
              ruleFired: e.ruleFired,
              output: e.output,
              engineVersion: e.engineVersion,
              treeVersion: e.treeVersion,
              requiresClinicianReview: false,
            }))
          );
        }
      } catch {
        // Silently fail
      }
    });
    auditLogger.logRuleEvaluated(
      'pre_tree_extraction',
      { bodyRegion, intent, treeSelected: tree.id },
      true,
      { treeId: tree.id, treeVersion: tree.version }
    );
    await auditLogger.flush();

    return walker.evaluateCurrentNode();
  }

  /**
   * Process a structured input (Partial<FactStore>) from LLM extraction.
   */
  static async processStructuredInput(
    sessionId: string,
    input: Partial<FactStore>
  ): Promise<CDEOutput> {
    const { walker, factStore, auditLogger } = await CDEEngine.loadSession(sessionId);

    // 1. Update fact store
    factStore.update(input);

    // 2. Red flag check (ALWAYS first)
    const rfResult = evaluateRedFlags(factStore.getStore());
    if (rfResult.triggered) {
      const flag = rfResult.flags[0];
      auditLogger.logRedFlagCheck(flag.flagId, input as Record<string, unknown>, true);
      auditLogger.logSessionHalted('Red flag triggered', flag.flagId);
      await CDEEngine.haltSession(sessionId, flag.flagId);
      await auditLogger.flush();

      return {
        type: 'red_flag_halt',
        emergency: {
          flagId: flag.flagId,
          urgency: flag.urgency,
          message: flag.haltMessage,
          action: flag.haltAction,
        },
        auditEntry: auditLogger.getAllEntries().slice(-1)[0],
      };
    }

    // 2b. Severity ceiling check (non-halting — stores recommendation flag)
    if (rfResult.severityCeiling) {
      factStore.set('severityCeilingTriggered', true);
      factStore.set('severityCeilingMessage', rfResult.severityCeilingMessage);
    }

    // 3. If not CDE ready, return next question
    if (!factStore.isCDEReady()) {
      const missing = factStore.getMissingCriticalFields();
      const audit = auditLogger.logRuleEvaluated('cde_readiness', { missing }, false);
      await CDEEngine.saveSession(sessionId, factStore, walker);
      await auditLogger.flush();

      return {
        type: 'question',
        nextQuestion: {
          id: '__cde_not_ready',
          text: `Still gathering information. Missing: ${missing.join(', ')}`,
          options: [],
          allowMultiple: false,
          uiType: 'radio',
        },
        auditEntry: audit,
      };
    }

    // 4. CDE ready — evaluate current tree node
    const output = walker.evaluateCurrentNode();

    // Mark tree as active so the orchestrator's processMessage guard can reliably detect it.
    // This is set inside the engine (not only in the orchestrator) so saveSession persists it.
    const isSentinelOutput = output.type === 'question' && output.nextQuestion.id.startsWith('__');
    if (!isSentinelOutput) {
      factStore.set('_treeActive', true);
    }

    await CDEEngine.saveSession(sessionId, factStore, walker);
    await auditLogger.flush();

    return output;
  }

  /**
   * Process a structured answer (from OptionSelector, SeveritySlider, etc.)
   */
  static async processAnswer(
    sessionId: string,
    questionId: string,
    answer: string | string[]
  ): Promise<CDEOutput> {
    const { walker, factStore, auditLogger } = await CDEEngine.loadSession(sessionId);

    const output = walker.processAnswer(questionId, answer);

    // Track how many tree questions have been answered (used by tree-active guard)
    const currentCount = (factStore.get('_treeQuestionsAnswered') as number) ?? 0;
    factStore.set('_treeQuestionsAnswered', currentCount + 1);

    // Mark tree as active so the orchestrator's processMessage guard blocks free-text LLM calls.
    factStore.set('_treeActive', true);

    // FIX 3: Store active question so UI can recover it on cold reload.
    if (output.type === 'question' && !output.nextQuestion.id.startsWith('__')) {
      factStore.set('_activeQuestion', output.nextQuestion);
    }

    // Save session state
    await CDEEngine.saveSession(sessionId, factStore, walker);

    // If halted, update session status
    if (walker.isHalted()) {
      await CDEEngine.haltSession(sessionId, output.type === 'red_flag_halt' ? output.emergency.flagId : 'unknown');
    }

    // If complete, update status
    if (walker.isComplete() && !walker.isHalted()) {
      await CDEEngine.updateSessionStatus(sessionId, 'games');
    }

    await auditLogger.flush();
    return output;
  }

  /**
   * Process a game result.
   *
   * Full pipeline: validate → interpret → store → check remaining → next game or resume tree.
   * When no games remain, resumes the tree walker (interpretation → care pathway nodes).
   */
  static async processGameResult(
    sessionId: string,
    gameId: string,
    rawScore: number,
    subScores?: { left?: number; right?: number },
    durationSeconds: number = 0
  ): Promise<{
    interpretation: Record<string, unknown>;
    nextGame?: GameRecommendation;
    careReady: boolean;
    treeOutput?: CDEOutput;
  }> {
    const { walker, factStore, auditLogger } = await CDEEngine.loadSession(sessionId);

    // 1. Interpret the game result using the 5-step chain (Tree 6)
    const interpretation = interpretGameResult(
      factStore.toJSON(),
      gameId,
      rawScore,
      subScores,
      durationSeconds
    );

    // 2. Store game result with full interpretation
    const bandMap: Record<string, GameScoreEntry['band']> = {
      below_10th: 'below_10',
      '10th_to_25th': '10_to_25',
      '25th_to_75th': '25_to_75',
      above_75th: 'above_75',
    };

    const scoreEntry: GameScoreEntry = {
      rawScore,
      percentile: interpretation.valid ? interpretation.percentile : 0,
      band: interpretation.valid
        ? (bandMap[interpretation.percentileBand] ?? 'below_10')
        : 'below_10',
      interpretation: interpretation.valid
        ? interpretation.patientFacingSummary
        : (interpretation.validationIssue ?? 'Invalid result'),
    };

    factStore.set(`gameScores.${gameId}`, scoreEntry);
    const completedGames = [...((factStore.get('completedGames') as string[]) ?? [])];
    if (!completedGames.includes(gameId)) {
      completedGames.push(gameId);
    }
    factStore.set('completedGames', completedGames);

    auditLogger.logRuleEvaluated(`game_result_${gameId}`, {
      rawScore,
      percentile: interpretation.percentile,
      band: interpretation.percentileBand,
      valid: interpretation.valid,
    }, interpretation.valid);

    // 3. Determine remaining games using the recommender pipeline (Tree 5)
    // walker.getHypotheses() is in-memory — falls back to factStore on cold restore
    const walkerHypotheses = walker.getHypotheses();
    const storedHypotheses = (factStore.get('activeHypotheses') as import('@/types/cde').Hypothesis[]) ?? [];
    const hypotheses = walkerHypotheses.length > 0 ? walkerHypotheses : storedHypotheses;
    const riskLevel = (factStore.get('riskLevel') as import('@/types/cde').RiskLevel) ?? 'GREEN';
    const conditionTags = (factStore.get('conditionTags') as string[]) ?? [];

    const remaining = recommendGames(
      hypotheses.map((h) => ({
        conditionId: h.conditionId,
        displayName: h.displayName,
        recommendedGames: h.recommendedGames,
        contraindicatedGames: h.contraindicatedGames,
      })),
      riskLevel,
      completedGames,
      conditionTags,
      3
    );

    let nextGame: GameRecommendation | undefined;
    let careReady = false;
    let treeOutput: CDEOutput | undefined;

    if (remaining.length > 0) {
      // More games to play — return the next one
      nextGame = remaining[0];
    } else {
      // All games done — resume the tree walker (interpretation → care nodes)
      careReady = true;
      treeOutput = walker.resumeAfterGames();

      // If the tree walker returned a completion sentinel, finalize the session
      if (treeOutput.type === 'question' && treeOutput.nextQuestion.id.startsWith('__')) {
        await CDEEngine.updateSessionStatus(sessionId, 'completed');
      }
    }

    await CDEEngine.saveSession(sessionId, factStore, walker);

    // Also persist game results to the dedicated gameResults DB column so
    // completeSession can reliably read them even on a cold load.
    try {
      const existing = await db.query.cdeScanSessions.findFirst({
        where: eq(cdeScanSessions.id, sessionId),
        columns: { gameResults: true },
      });
      const existingResults = (existing?.gameResults ?? {}) as Record<string, unknown>;
      existingResults[gameId] = scoreEntry;
      await db
        .update(cdeScanSessions)
        .set({ gameResults: existingResults })
        .where(eq(cdeScanSessions.id, sessionId));
    } catch {
      // DB unavailable — factStore copy is the fallback
    }

    await auditLogger.flush();

    return {
      interpretation: interpretation as unknown as Record<string, unknown>,
      nextGame,
      careReady,
      treeOutput,
    };
  }

  /**
   * Get a session by ID.
   */
  static async getSession(sessionId: string): Promise<ScanSession | { error: string }> {
    try {
      const session = await db.query.cdeScanSessions.findFirst({
        where: eq(cdeScanSessions.id, sessionId),
      });

      if (!session) {
        return { error: 'session_not_found' };
      }

      return session as unknown as ScanSession;
    } catch {
      return { error: 'database_error' };
    }
  }

  /**
   * Complete a session and generate final summary.
   */
  static async completeSession(sessionId: string): Promise<{
    summary: Record<string, unknown>;
    careRecommendation: CareRecommendationData | null;
    musculageScore: number;
    crossScanRecommendations: Record<string, unknown>[];
  }> {
    const { walker, factStore } = await CDEEngine.loadSession(sessionId);

    // walker.getHypotheses() is in-memory — falls back to factStore on cold restore
    const walkerHypotheses = walker.getHypotheses();
    const storedHypotheses = (factStore.get('activeHypotheses') as import('@/types/cde').Hypothesis[]) ?? [];
    const hypotheses = walkerHypotheses.length > 0 ? walkerHypotheses : storedHypotheses;
    const store = factStore.getStore();

    // Compute risk using additive factor scoring (Tree 4)
    const riskBreakdown = computeRiskBreakdown(factStore.toJSON());
    const riskLevel = riskBreakdown.riskLevel;

    // Merge factStore.gameScores with the dedicated gameResults DB column.
    // The DB column is the authoritative source because processGameResult always writes there,
    // whereas factStore may be stale if loaded from walker cache.
    let dbGameResults: Record<string, GameScoreEntry> = {};
    try {
      const dbSession = await db.query.cdeScanSessions.findFirst({
        where: eq(cdeScanSessions.id, sessionId),
        columns: { gameResults: true },
      });
      dbGameResults = (dbSession?.gameResults ?? {}) as Record<string, GameScoreEntry>;
    } catch {
      // DB unavailable — fall back to factStore only
    }

    // gameScores: DB column takes priority; factStore fills any gaps
    const gameScores: Record<string, GameScoreEntry> = {
      ...store.gameScores,
      ...dbGameResults,
    };

    // Logging to trace parameter mapping
    console.log('[ParameterScores] All game results:', Object.keys(gameScores));
    for (const [gId, result] of Object.entries(gameScores)) {
      const prefix = gId.substring(0, 2);
      const paramMap2: Record<string, string> = { BB: 'BAL', FA: 'ROM', NN: 'MOB', KS: 'REF' };
      const param = paramMap2[prefix];
      const percentile = (result as any)?.percentile ?? (result as any)?.interpretation?.percentile ?? null;
      console.log(`[ParameterScores] ${gId}: prefix=${prefix}, param=${param}, percentile=${percentile}, type=${typeof percentile}`);
    }

    const scoreValues = Object.values(gameScores).map((g) => {
      const pct = (g as any)?.percentile ?? (g as any)?.interpretation?.percentile ?? 0;
      return typeof pct === 'number' ? pct : 0;
    });
    const musculageScore = scoreValues.length > 0
      ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length)
      : 0;

    // Compute per-parameter breakdown for the results page (BAL / ROM / MOB / REF)
    const paramMap: Record<string, string> = { BB: 'BAL', FA: 'ROM', NN: 'MOB', KS: 'REF' };
    const parameterScores: Record<string, number | null> = { BAL: null, ROM: null, MOB: null, REF: null };
    for (const [gId, entry] of Object.entries(gameScores)) {
      const percentile: number = (entry as any)?.percentile ?? (entry as any)?.interpretation?.percentile ?? 0;
      if (percentile > 0) {
        const param = paramMap[gId.substring(0, 2)];
        if (param && (parameterScores[param] === null || percentile > (parameterScores[param] ?? 0))) {
          parameterScores[param] = Math.round(percentile);
        }
      }
    }

    // Match care pathway using multi-factor scoring (Tree 7)
    const gameScorePercentiles: Record<string, number> = {};
    for (const [gId, entry] of Object.entries(gameScores)) {
      const pct: number = (entry as any)?.percentile ?? (entry as any)?.interpretation?.percentile ?? 0;
      if (pct > 0) gameScorePercentiles[gId] = pct;
    }

    const careRecommendation: CareRecommendationData = matchCarePathway(
      factStore.toJSON(),
      hypotheses.map((h) => ({
        conditionId: h.conditionId,
        displayName: h.displayName,
        confidence: h.confidence,
      })),
      riskLevel,
      Object.keys(gameScorePercentiles).length > 0 ? gameScorePercentiles : undefined,
    );

    // Cross-scan recommendations
    const crossScans: Record<string, unknown>[] = [];
    const auditEntries = walker.getAuditEntries();
    for (const entry of auditEntries) {
      if (entry.eventType === 'cross_scan_triggered') {
        crossScans.push(entry.output);
      }
    }

    // Update session
    await CDEEngine.updateSessionStatus(sessionId, 'completed');

    try {
      await db
        .update(cdeScanSessions)
        .set({
          musculageScore,
          careRecommendation: careRecommendation as unknown as Record<string, unknown>,
          totalScore: riskBreakdown.totalScore,
          riskLevel: riskLevel,
          completedAt: new Date(),
        })
        .where(eq(cdeScanSessions.id, sessionId));
    } catch {
      // Database not available
    }

    return {
      summary: {
        totalScore: riskBreakdown.totalScore,
        riskTier: riskLevel,
        riskLevel,
        riskBreakdown,
        hypotheses: hypotheses.map((h) => ({
          conditionId: h.conditionId,
          condition: h.displayName,
          confidence: h.confidence,
        })),
        layerScores: walker.getLayerScores(),
        conditionTags: store.conditionTags,
        musculageScore,
        parameterScores,
      },
      careRecommendation,
      musculageScore,
      crossScanRecommendations: crossScans,
    };
  }

  // ─── Private Helpers ───

  private static async loadSession(sessionId: string): Promise<{
    walker: TreeWalker;
    factStore: FactStoreManager;
    auditLogger: AuditLogger;
  }> {
    // Try cache first (with TTL check)
    let walker = getCachedWalker(sessionId);
    let factStore: FactStoreManager;

    if (walker) {
      // Walker exists in cache; extract fact store from walker
      factStore = new FactStoreManager(walker['factStore']?.getStore?.() ?? {});
    } else {
      // Load from database
      try {
        const session = await db.query.cdeScanSessions.findFirst({
          where: eq(cdeScanSessions.id, sessionId),
        });

        if (!session) {
          throw new Error('session_not_found');
        }

        factStore = FactStoreManager.fromJSON(session.factStore as Record<string, unknown>);

        // Load tree via tree-loader (DB → JSON → fallback)
        let tree: DecisionTree;
        try {
          tree = await loadTree(session.decisionTreeId);
        } catch {
          tree = CDEEngine.createMinimalTree(session.decisionTreeId);
        }

        walker = new TreeWalker(tree, factStore);

        // Restore position so the walker continues from where the session left off
        const savedNodeId = factStore.get('_walkerNodeId') as string | null;
        const savedQuestionIndex = (factStore.get('_walkerNodeQuestionIndex') as number) ?? 0;
        const savedWaitingForGames = (factStore.get('_walkerWaitingForGames') as boolean) ?? false;
        if (savedNodeId) {
          walker.restoreState({
            currentNodeId: savedNodeId,
            nodeQuestionIndex: savedQuestionIndex,
            waitingForGames: savedWaitingForGames,
          });
        }

        setCachedWalker(sessionId, walker);
      } catch {
        // Fallback for when DB is unavailable
        factStore = new FactStoreManager();
        const tree = CDEEngine.createMinimalTree('DT_FALLBACK');
        walker = new TreeWalker(tree, factStore);
        setCachedWalker(sessionId, walker);
      }
    }

    const auditLogger = new AuditLogger(sessionId, CDE_ENGINE_VERSION, '1.0.0');

    // Set up DB flush for audit logger
    auditLogger.setFlushFunction(async (entries) => {
      try {
        if (entries.length > 0) {
          await db.insert(cdeAuditLog).values(
            entries.map((e) => ({
              sessionId,
              eventType: e.eventType,
              layer: e.layer ?? null,
              nodeId: e.nodeId ?? null,
              ruleId: e.ruleId ?? null,
              factsEvaluated: e.factsEvaluated,
              ruleFired: e.ruleFired,
              output: e.output,
              engineVersion: e.engineVersion,
              treeVersion: e.treeVersion,
              requiresClinicianReview: (e as any).requiresClinicianReview ?? false,
            }))
          );
        }
      } catch {
        // Silently fail DB writes in development
      }
    });

    return { walker, factStore, auditLogger };
  }

  private static async saveSession(
    sessionId: string,
    factStore: FactStoreManager,
    walker: TreeWalker
  ): Promise<void> {
    try {
      // Persist walker position so cold DB reconstructions restore to the correct node
      const walkerState = walker.getWalkerState();
      factStore.set('_walkerNodeId', walkerState.currentNodeId);
      factStore.set('_walkerNodeQuestionIndex', walkerState.nodeQuestionIndex);
      factStore.set('_walkerWaitingForGames', walkerState.waitingForGames);

      const progress = walker.getProgress();
      await db
        .update(cdeScanSessions)
        .set({
          factStore: factStore.toJSON(),
          currentLayer: progress.currentLayer,
          riskLevel: factStore.get('riskLevel') as string ?? null,
          allHypotheses: walker.getHypotheses() as unknown as Record<string, unknown>[],
          layerScores: walker.getLayerScores(),
          totalScore: walker.getTotalScore(),
        })
        .where(eq(cdeScanSessions.id, sessionId));
    } catch {
      // Database not available
    }
  }

  private static async haltSession(sessionId: string, flagId: string): Promise<void> {
    try {
      await db
        .update(cdeScanSessions)
        .set({
          status: 'halted',
          haltedAt: new Date(),
          haltReason: `Red flag: ${flagId}`,
        })
        .where(eq(cdeScanSessions.id, sessionId));
    } catch {
      // Database not available
    }
  }

  private static async updateSessionStatus(
    sessionId: string,
    status: string
  ): Promise<void> {
    try {
      const updates: Record<string, unknown> = { status };
      if (status === 'completed') {
        updates.completedAt = new Date();
      }
      await db
        .update(cdeScanSessions)
        .set(updates)
        .where(eq(cdeScanSessions.id, sessionId));
    } catch {
      // Database not available
    }
  }

  private static createMinimalTree(id: string): DecisionTree {
    return {
      id,
      version: '1.0.0',
      moduleType: 'location',
      entryCondition: {},
      architecture: {
        type: 'symptom_dominant',
        scoringWeights: { layer0: 0, layer1: 0.30, layer2: 0.30, layer3: 0.40 },
      },
      crossReferences: [],
      layers: {
        layer0: { name: 'Red Flag Screen', questions: [] },
        layer1: { name: 'Symptom Profile', questions: [] },
        layer2: { name: 'Functional Impact', questions: [] },
        layer3: { name: 'Risk Modifiers', questions: [] },
      },
      riskTierThresholds: { low: [0, 4], moderate: [5, 8], high: [9, 100] },
      hypothesisRules: [],
      careMatchingRules: [],
      disclaimers: {
        standard: 'Kriya QuickScan is a self-reported wellness risk tool, not a medical diagnosis.',
        moduleSpecific: '',
      },
    };
  }
}
