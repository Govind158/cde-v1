/**
 * Audit Logger — Append-only decision logging
 * Every CDE decision is logged for clinical governance, debugging, and compliance.
 * APPEND-ONLY: entries are never modified or deleted.
 */

import type { AuditEntry, Hypothesis } from '@/types/cde';

const BUFFER_FLUSH_THRESHOLD = 50;

export class AuditLogger {
  private sessionId: string;
  private engineVersion: string;
  private treeVersion: string;
  private buffer: AuditEntry[] = [];
  private flushed: AuditEntry[] = [];
  private dbFlushFn: ((entries: AuditEntry[]) => Promise<void>) | null = null;

  constructor(sessionId: string, engineVersion: string, treeVersion: string) {
    this.sessionId = sessionId;
    this.engineVersion = engineVersion;
    this.treeVersion = treeVersion;
  }

  /**
   * Set the database flush function. In production this writes to cdeAuditLog.
   * For testing, this can be replaced with a mock.
   */
  setFlushFunction(fn: (entries: AuditEntry[]) => Promise<void>): void {
    this.dbFlushFn = fn;
  }

  private createEntry(
    eventType: string,
    overrides: Partial<AuditEntry> = {}
  ): AuditEntry {
    const entry: AuditEntry = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      eventType,
      factsEvaluated: {},
      ruleFired: false,
      output: {},
      engineVersion: this.engineVersion,
      treeVersion: this.treeVersion,
      ...overrides,
    };

    this.buffer.push(entry);

    // Auto-flush when buffer exceeds threshold
    if (this.buffer.length >= BUFFER_FLUSH_THRESHOLD) {
      this.flush().catch(() => {});
    }

    return entry;
  }

  logRedFlagCheck(
    flagId: string,
    factsChecked: Record<string, unknown>,
    triggered: boolean,
    output?: Record<string, unknown>
  ): AuditEntry {
    return this.createEntry('red_flag_check', {
      ruleId: flagId,
      factsEvaluated: factsChecked,
      ruleFired: triggered,
      output: output ?? {},
    });
  }

  logQuestionAnswered(
    questionId: string,
    layer: number,
    answer: string | string[],
    score: number
  ): AuditEntry {
    return this.createEntry('question_answered', {
      nodeId: questionId,
      layer,
      factsEvaluated: { answer, score },
      ruleFired: score > 0,
    });
  }

  logRuleEvaluated(
    ruleId: string,
    factsEvaluated: Record<string, unknown>,
    fired: boolean,
    output?: Record<string, unknown>
  ): AuditEntry {
    return this.createEntry('rule_evaluated', {
      ruleId,
      factsEvaluated,
      ruleFired: fired,
      output: output ?? {},
    });
  }

  logHypothesisGenerated(hypotheses: Hypothesis[]): AuditEntry {
    return this.createEntry('hypothesis_generated', {
      output: {
        hypotheses: hypotheses.map((h) => ({
          conditionId: h.conditionId,
          confidence: h.confidence,
          displayName: h.displayName,
        })),
      },
      ruleFired: hypotheses.length > 0,
    });
  }

  logGameRecommended(games: string[], rationale: string): AuditEntry {
    return this.createEntry('game_recommended', {
      output: { games, rationale },
      ruleFired: games.length > 0,
    });
  }

  logScoreInterpreted(
    gameId: string,
    rawScore: number,
    percentile: number,
    interpretation: string
  ): AuditEntry {
    return this.createEntry('score_interpreted', {
      nodeId: gameId,
      factsEvaluated: { rawScore, percentile },
      output: { interpretation },
    });
  }

  logCareMatched(
    pathwayId: string,
    matchScore: number,
    rationale: string
  ): AuditEntry {
    return this.createEntry('care_matched', {
      ruleId: pathwayId,
      factsEvaluated: { matchScore },
      output: { rationale },
      ruleFired: true,
    });
  }

  logCrossScanTriggered(targetModule: string, tags: string[]): AuditEntry {
    return this.createEntry('cross_scan_triggered', {
      output: { targetModule, tags },
      ruleFired: true,
    });
  }

  logSessionHalted(reason: string, flagId?: string): AuditEntry {
    return this.createEntry('session_halted', {
      ruleId: flagId,
      output: { reason },
      ruleFired: true,
    });
  }

  /**
   * Flush all pending entries to the database.
   * Marks entries requiring clinician review based on event type and severity.
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    // Mark entries requiring clinician review
    const markedEntries = entries.map((entry) => {
      const requiresReview =
        (entry.eventType === 'red_flag_check' && entry.ruleFired) ||
        entry.eventType === 'session_halted';

      return {
        ...entry,
        requiresClinicianReview: requiresReview,
      };
    });

    // Write to database if flush function is set
    if (this.dbFlushFn) {
      await this.dbFlushFn(markedEntries);
    }

    this.flushed.push(...markedEntries);
  }

  /** Get all entries (both buffered and flushed) */
  getAllEntries(): AuditEntry[] {
    return [...this.flushed, ...this.buffer];
  }

  /** Get entries still in buffer (not yet flushed) */
  getBufferedEntries(): AuditEntry[] {
    return [...this.buffer];
  }

  /** Get count of buffered entries */
  getBufferSize(): number {
    return this.buffer.length;
  }
}
