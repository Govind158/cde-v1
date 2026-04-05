/**
 * Audit Logger Tests — 15+ test cases
 */

import { describe, it, expect, vi } from 'vitest';
import { AuditLogger } from '../audit-logger';

describe('AuditLogger', () => {
  const SESSION_ID = 'test-session-123';
  const ENGINE_VERSION = '1.0.0';
  const TREE_VERSION = '1.0.0';

  function createLogger() {
    return new AuditLogger(SESSION_ID, ENGINE_VERSION, TREE_VERSION);
  }

  // ─── Entry Creation ───
  describe('entry creation', () => {
    it('creates red flag check entries', () => {
      const logger = createLogger();
      const entry = logger.logRedFlagCheck('rf_cauda_equina', { bowelBladder: true }, true);
      expect(entry.eventType).toBe('red_flag_check');
      expect(entry.ruleId).toBe('rf_cauda_equina');
      expect(entry.ruleFired).toBe(true);
      expect(entry.sessionId).toBe(SESSION_ID);
    });

    it('creates question answered entries', () => {
      const logger = createLogger();
      const entry = logger.logQuestionAnswered('Q1.1', 1, 'gt_3m', 4);
      expect(entry.eventType).toBe('question_answered');
      expect(entry.nodeId).toBe('Q1.1');
      expect(entry.layer).toBe(1);
    });

    it('creates hypothesis generated entries', () => {
      const logger = createLogger();
      const entry = logger.logHypothesisGenerated([
        { conditionId: 'hyp_postural', subtype: null, confidence: 'high', recommendedGames: [], contraindicatedGames: [], displayName: 'Postural LBP' },
      ]);
      expect(entry.eventType).toBe('hypothesis_generated');
      expect(entry.ruleFired).toBe(true);
    });

    it('creates game recommended entries', () => {
      const logger = createLogger();
      const entry = logger.logGameRecommended(['NN2', 'FA3'], 'Based on postural hypothesis');
      expect(entry.eventType).toBe('game_recommended');
    });

    it('creates score interpreted entries', () => {
      const logger = createLogger();
      const entry = logger.logScoreInterpreted('FA1', 45, 22, 'Below average');
      expect(entry.eventType).toBe('score_interpreted');
      expect(entry.nodeId).toBe('FA1');
    });

    it('creates care matched entries', () => {
      const logger = createLogger();
      const entry = logger.logCareMatched('cp_lbp_guided', 0.85, 'Matched based on moderate risk');
      expect(entry.eventType).toBe('care_matched');
    });

    it('creates cross scan triggered entries', () => {
      const logger = createLogger();
      const entry = logger.logCrossScanTriggered('sciatica', ['BELOW_KNEE_RADICULOPATHY']);
      expect(entry.eventType).toBe('cross_scan_triggered');
    });

    it('creates session halted entries', () => {
      const logger = createLogger();
      const entry = logger.logSessionHalted('Red flag triggered', 'rf_cauda_equina');
      expect(entry.eventType).toBe('session_halted');
      expect(entry.ruleId).toBe('rf_cauda_equina');
    });
  });

  // ─── Buffering ───
  describe('buffering', () => {
    it('buffers entries before flush', () => {
      const logger = createLogger();
      logger.logQuestionAnswered('Q1.1', 1, 'a', 1);
      logger.logQuestionAnswered('Q1.2', 1, 'b', 2);
      expect(logger.getBufferSize()).toBe(2);
    });

    it('clears buffer after flush', async () => {
      const logger = createLogger();
      logger.logQuestionAnswered('Q1.1', 1, 'a', 1);
      await logger.flush();
      expect(logger.getBufferSize()).toBe(0);
    });

    it('preserves entries in getAllEntries after flush', async () => {
      const logger = createLogger();
      logger.logQuestionAnswered('Q1.1', 1, 'a', 1);
      await logger.flush();
      expect(logger.getAllEntries().length).toBe(1);
    });
  });

  // ─── Database Flush ───
  describe('database flush', () => {
    it('calls flush function with entries', async () => {
      const logger = createLogger();
      const flushFn = vi.fn().mockResolvedValue(undefined);
      logger.setFlushFunction(flushFn);

      logger.logQuestionAnswered('Q1.1', 1, 'a', 1);
      logger.logQuestionAnswered('Q1.2', 1, 'b', 2);
      await logger.flush();

      expect(flushFn).toHaveBeenCalledTimes(1);
      expect(flushFn.mock.calls[0][0]).toHaveLength(2);
    });

    it('does not call flush function when buffer is empty', async () => {
      const logger = createLogger();
      const flushFn = vi.fn().mockResolvedValue(undefined);
      logger.setFlushFunction(flushFn);

      await logger.flush();
      expect(flushFn).not.toHaveBeenCalled();
    });
  });

  // ─── Clinician Review Flagging ───
  describe('clinician review flagging', () => {
    it('marks red flag check with ruleFired=true for review', async () => {
      const logger = createLogger();
      const flushedEntries: any[] = [];
      logger.setFlushFunction(async (entries) => { flushedEntries.push(...entries); });

      logger.logRedFlagCheck('rf_cauda_equina', {}, true);
      await logger.flush();

      expect(flushedEntries[0].requiresClinicianReview).toBe(true);
    });

    it('marks session halted entries for review', async () => {
      const logger = createLogger();
      const flushedEntries: any[] = [];
      logger.setFlushFunction(async (entries) => { flushedEntries.push(...entries); });

      logger.logSessionHalted('Red flag', 'rf_cauda_equina');
      await logger.flush();

      expect(flushedEntries[0].requiresClinicianReview).toBe(true);
    });

    it('does NOT mark regular question answers for review', async () => {
      const logger = createLogger();
      const flushedEntries: any[] = [];
      logger.setFlushFunction(async (entries) => { flushedEntries.push(...entries); });

      logger.logQuestionAnswered('Q1.1', 1, 'a', 1);
      await logger.flush();

      expect(flushedEntries[0].requiresClinicianReview).toBe(false);
    });
  });

  // ─── Serialization ───
  describe('serialization', () => {
    it('entries have correct timestamps', () => {
      const logger = createLogger();
      const before = new Date().toISOString();
      const entry = logger.logQuestionAnswered('Q1.1', 1, 'a', 1);
      const after = new Date().toISOString();

      expect(entry.timestamp >= before).toBe(true);
      expect(entry.timestamp <= after).toBe(true);
    });

    it('entries include engine and tree version', () => {
      const logger = createLogger();
      const entry = logger.logQuestionAnswered('Q1.1', 1, 'a', 1);
      expect(entry.engineVersion).toBe(ENGINE_VERSION);
      expect(entry.treeVersion).toBe(TREE_VERSION);
    });
  });
});
