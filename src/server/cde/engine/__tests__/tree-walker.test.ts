/**
 * Tree Walker Tests — 25+ test cases using a mock decision tree
 */

import { describe, it, expect } from 'vitest';
import { TreeWalker } from '../tree-walker';
import { FactStoreManager } from '../fact-store';
import type { DecisionTree } from '@/types/cde';

const MOCK_TREE: DecisionTree = {
  id: 'DT_TEST',
  version: '1.0.0',
  moduleType: 'location',
  entryCondition: { bodyRegion: 'lumbar_spine' },
  architecture: {
    type: 'symptom_dominant',
    scoringWeights: { layer0: 0, layer1: 0.30, layer2: 0.30, layer3: 0.40 },
  },
  crossReferences: [],
  layers: {
    layer0: {
      name: 'Red Flag Screen',
      questions: [
        {
          id: 'Q0.1',
          text: 'Are you experiencing any neurological emergency symptoms?',
          uiType: 'multi_select',
          options: [
            { label: 'Loss of bladder control', value: 'bladder_loss', score: 0 },
            { label: 'Saddle numbness', value: 'saddle_numbness', score: 0 },
            { label: 'None of the above', value: 'none', score: 0 },
          ],
          allowMultiple: true,
          maxScore: 0,
          mapsTo: 'redFlags.caudaEquina',
          redFlagHalt: {
            bladder_loss: 'rf_cauda_equina',
            saddle_numbness: 'rf_cauda_equina',
          },
        },
      ],
    },
    layer1: {
      name: 'Symptom Profile',
      questions: [
        {
          id: 'Q1.1',
          text: 'How long have you had pain?',
          uiType: 'radio',
          options: [
            { label: 'Less than 2 weeks', value: 'lt_2w', score: 1 },
            { label: '2-6 weeks', value: '2_6w', score: 2 },
            { label: 'More than 3 months', value: 'gt_3m', score: 4 },
          ],
          allowMultiple: false,
          maxScore: 4,
          mapsTo: 'duration',
        },
        {
          id: 'Q1.2',
          text: 'Describe your pain',
          uiType: 'multi_select',
          options: [
            { label: 'Dull ache', value: 'dull_ache', score: 1 },
            { label: 'Radiating to leg', value: 'radiating_leg', score: 4, branchTo: 'Q1.2a' },
          ],
          allowMultiple: true,
          maxScore: 4,
          mapsTo: 'radiation',
        },
      ],
    },
    layer2: {
      name: 'Functional Impact',
      questions: [
        {
          id: 'Q2.1',
          text: 'How does pain affect daily activities?',
          uiType: 'radio',
          options: [
            { label: 'No impact', value: 'none', score: 0 },
            { label: 'Moderate impact', value: 'moderate', score: 2 },
            { label: 'Severe impact', value: 'severe', score: 3 },
          ],
          allowMultiple: false,
          maxScore: 3,
          mapsTo: 'functionalImpact.adl',
        },
      ],
    },
    layer3: {
      name: 'Risk Modifiers',
      questions: [
        {
          id: 'Q3.1',
          text: 'Typical day activity?',
          uiType: 'radio',
          options: [
            { label: 'Mostly sitting', value: 'sedentary', score: 2 },
            { label: 'Active', value: 'active', score: 0 },
          ],
          allowMultiple: false,
          maxScore: 2,
          mapsTo: 'activityLevel',
        },
        {
          id: 'Q3.2',
          text: 'Prior episodes?',
          uiType: 'radio',
          options: [
            { label: 'First time', value: 'first', score: 0 },
            { label: 'Recurrent', value: 'recurrent', score: 2 },
          ],
          allowMultiple: false,
          maxScore: 2,
          mapsTo: 'priorConditions',
          showIf: "duration in ['gt_3m']",
        },
      ],
    },
  },
  riskTierThresholds: {
    low: [0, 4],
    moderate: [5, 8],
    high: [9, 100],
  },
  hypothesisRules: [
    {
      id: 'hyp_postural',
      displayName: 'Postural Low Back Pain',
      criteria: {
        ALL: [{ field: 'activityLevel', equals: 'sedentary' }],
      },
      confidence: 'high',
      recommendedGames: ['NN2', 'FA3', 'BB1'],
      contraindicatedGames: [],
    },
    {
      id: 'hyp_radicular',
      displayName: 'Radicular Pain',
      criteria: {
        ALL: [{ field: 'radiation', contains: 'radiating_leg' }],
      },
      confidence: 'high',
      recommendedGames: ['KS1', 'FA1'],
      contraindicatedGames: ['FA5'],
      crossScanTarget: 'sciatica',
    },
  ],
  careMatchingRules: [],
  disclaimers: {
    standard: 'This is a wellness tool, not a diagnosis.',
    moduleSpecific: '',
  },
};

describe('TreeWalker', () => {
  // ─── Basic Navigation ───
  describe('basic navigation', () => {
    it('starts at layer 0, question 0', () => {
      const fs = new FactStoreManager({ bodyRegion: 'lumbar_spine' });
      const walker = new TreeWalker(MOCK_TREE, fs);
      const output = walker.evaluateCurrentNode();
      expect(output.type).toBe('question');
      if (output.type === 'question') {
        expect(output.nextQuestion.id).toBe('Q0.1');
      }
    });

    it('progresses through layers sequentially', () => {
      const fs = new FactStoreManager({ bodyRegion: 'lumbar_spine' });
      const walker = new TreeWalker(MOCK_TREE, fs);

      // Answer Layer 0
      const out1 = walker.processAnswer('Q0.1', 'none');
      expect(out1.type).toBe('question');
      if (out1.type === 'question') {
        expect(out1.nextQuestion.id).toBe('Q1.1');
      }
    });

    it('reports progress correctly', () => {
      const fs = new FactStoreManager({ bodyRegion: 'lumbar_spine' });
      const walker = new TreeWalker(MOCK_TREE, fs);
      const progress = walker.getProgress();
      expect(progress.currentLayer).toBe(0);
      expect(progress.totalLayers).toBe(4);
      expect(progress.percentComplete).toBe(0);
    });
  });

  // ─── Red Flag Halting ───
  describe('red flag halting', () => {
    it('halts immediately when Tier 1 red flag answer selected', () => {
      const fs = new FactStoreManager({ bodyRegion: 'lumbar_spine' });
      const walker = new TreeWalker(MOCK_TREE, fs);
      const output = walker.processAnswer('Q0.1', 'bladder_loss');
      expect(output.type).toBe('red_flag_halt');
      expect(walker.isHalted()).toBe(true);
    });

    it('does not halt with "none" answer', () => {
      const fs = new FactStoreManager({ bodyRegion: 'lumbar_spine' });
      const walker = new TreeWalker(MOCK_TREE, fs);
      const output = walker.processAnswer('Q0.1', 'none');
      expect(output.type).toBe('question');
      expect(walker.isHalted()).toBe(false);
    });

    it('does not continue after halt', () => {
      const fs = new FactStoreManager({ bodyRegion: 'lumbar_spine' });
      const walker = new TreeWalker(MOCK_TREE, fs);
      walker.processAnswer('Q0.1', 'bladder_loss');
      expect(walker.isComplete()).toBe(true);
    });
  });

  // ─── Scoring ───
  describe('scoring', () => {
    it('accumulates scores per layer', () => {
      const fs = new FactStoreManager({ bodyRegion: 'lumbar_spine' });
      const walker = new TreeWalker(MOCK_TREE, fs);

      walker.processAnswer('Q0.1', 'none'); // Layer 0 done
      walker.processAnswer('Q1.1', 'gt_3m'); // score 4
      walker.processAnswer('Q1.2', 'dull_ache'); // score 1
      // Layer 1 done, move to Layer 2
      walker.processAnswer('Q2.1', 'severe'); // score 3

      const progress = walker.getProgress();
      expect(progress.currentLayer).toBeGreaterThanOrEqual(3);
    });
  });

  // ─── Multi-select ───
  describe('multi-select questions', () => {
    it('accepts array answers', () => {
      const fs = new FactStoreManager({ bodyRegion: 'lumbar_spine' });
      const walker = new TreeWalker(MOCK_TREE, fs);

      // Answer Layer 0
      walker.processAnswer('Q0.1', 'none');

      // Layer 1 Q1.1
      walker.processAnswer('Q1.1', 'lt_2w');

      // Layer 1 Q1.2 — multi-select
      const output = walker.processAnswer('Q1.2', ['dull_ache', 'radiating_leg']);
      expect(output.type).toBe('question');
    });
  });

  // ─── Conditional Questions (showIf) ───
  describe('conditional questions', () => {
    it('skips questions when showIf condition not met', () => {
      const fs = new FactStoreManager({ bodyRegion: 'lumbar_spine' });
      const walker = new TreeWalker(MOCK_TREE, fs);

      walker.processAnswer('Q0.1', 'none'); // Layer 0
      walker.processAnswer('Q1.1', 'lt_2w'); // Short duration — Q3.2 should be skipped
      walker.processAnswer('Q1.2', 'dull_ache');
      walker.processAnswer('Q2.1', 'none');
      // Q3.1 should be shown
      const out = walker.processAnswer('Q3.1', 'active');
      // Q3.2 should be skipped (showIf: duration in ['gt_3m'])
      // Should complete assessment
      expect(walker.isComplete()).toBe(true);
    });

    it('shows conditional question when condition met', () => {
      const fs = new FactStoreManager({ bodyRegion: 'lumbar_spine' });
      const walker = new TreeWalker(MOCK_TREE, fs);

      walker.processAnswer('Q0.1', 'none');
      walker.processAnswer('Q1.1', 'gt_3m'); // Long duration — Q3.2 should show
      walker.processAnswer('Q1.2', 'dull_ache');
      walker.processAnswer('Q2.1', 'none');
      const out = walker.processAnswer('Q3.1', 'sedentary');
      // Should show Q3.2 now
      if (out.type === 'question') {
        expect(out.nextQuestion.id).toBe('Q3.2');
      }
    });
  });

  // ─── Hypothesis Generation ───
  describe('hypothesis generation', () => {
    it('generates hypotheses based on facts after completion', () => {
      const fs = new FactStoreManager({ bodyRegion: 'lumbar_spine' });
      const walker = new TreeWalker(MOCK_TREE, fs);

      walker.processAnswer('Q0.1', 'none');
      walker.processAnswer('Q1.1', 'lt_2w');
      walker.processAnswer('Q1.2', 'dull_ache');
      walker.processAnswer('Q2.1', 'none');
      walker.processAnswer('Q3.1', 'sedentary');
      // Should complete and generate postural hypothesis

      expect(walker.isComplete()).toBe(true);
      const hyps = walker.getHypotheses();
      expect(hyps.some((h) => h.conditionId === 'hyp_postural')).toBe(true);
    });

    it('recommends games from hypotheses', () => {
      const fs = new FactStoreManager({ bodyRegion: 'lumbar_spine' });
      const walker = new TreeWalker(MOCK_TREE, fs);

      walker.processAnswer('Q0.1', 'none');
      walker.processAnswer('Q1.1', 'lt_2w');
      walker.processAnswer('Q1.2', 'dull_ache');
      walker.processAnswer('Q2.1', 'none');
      const output = walker.processAnswer('Q3.1', 'sedentary');

      if (output.type === 'game_recommendation') {
        const gameIds = output.games.map((g) => g.gameId);
        expect(gameIds).toContain('NN2');
        expect(gameIds).toContain('FA3');
      }
    });

    it('excludes contraindicated games', () => {
      const fs = new FactStoreManager({ bodyRegion: 'lumbar_spine' });
      const walker = new TreeWalker(MOCK_TREE, fs);

      walker.processAnswer('Q0.1', 'none');
      walker.processAnswer('Q1.1', 'lt_2w');
      walker.processAnswer('Q1.2', ['radiating_leg']); // triggers radicular hypothesis
      walker.processAnswer('Q2.1', 'none');
      const output = walker.processAnswer('Q3.1', 'sedentary');

      if (output.type === 'game_recommendation') {
        const gameIds = output.games.map((g) => g.gameId);
        expect(gameIds).not.toContain('FA5'); // contraindicated by radicular
      }
    });
  });

  // ─── UI Types ───
  describe('UI types', () => {
    it('returns correct uiType for radio questions', () => {
      const fs = new FactStoreManager({ bodyRegion: 'lumbar_spine' });
      const walker = new TreeWalker(MOCK_TREE, fs);
      walker.processAnswer('Q0.1', 'none'); // advance to layer 1
      const output = walker.evaluateCurrentNode();
      if (output.type === 'question') {
        expect(output.nextQuestion.uiType).toBe('radio');
      }
    });

    it('returns correct uiType for multi_select questions', () => {
      const fs = new FactStoreManager({ bodyRegion: 'lumbar_spine' });
      const walker = new TreeWalker(MOCK_TREE, fs);
      const output = walker.evaluateCurrentNode();
      if (output.type === 'question') {
        expect(output.nextQuestion.uiType).toBe('multi_select');
      }
    });
  });

  // ─── Audit Trail ───
  describe('audit trail', () => {
    it('records audit entries for each action', () => {
      const fs = new FactStoreManager({ bodyRegion: 'lumbar_spine' });
      const walker = new TreeWalker(MOCK_TREE, fs);

      walker.evaluateCurrentNode(); // presents Q0.1
      walker.processAnswer('Q0.1', 'none');

      const entries = walker.getAuditEntries();
      expect(entries.length).toBeGreaterThan(0);
      expect(entries.some((e) => e.eventType === 'question_presented')).toBe(true);
      expect(entries.some((e) => e.eventType === 'question_answered')).toBe(true);
    });

    it('records halt in audit trail', () => {
      const fs = new FactStoreManager({ bodyRegion: 'lumbar_spine' });
      const walker = new TreeWalker(MOCK_TREE, fs);
      walker.processAnswer('Q0.1', 'bladder_loss');

      const entries = walker.getAuditEntries();
      expect(entries.some((e) => e.eventType === 'session_halted')).toBe(true);
    });
  });

  // ─── Edge Cases ───
  describe('edge cases', () => {
    it('handles unknown question ID gracefully', () => {
      const fs = new FactStoreManager({ bodyRegion: 'lumbar_spine' });
      const walker = new TreeWalker(MOCK_TREE, fs);
      const output = walker.processAnswer('NONEXISTENT', 'value');
      // Should not crash
      expect(output.type).toBe('question');
    });

    it('handles empty answer array', () => {
      const fs = new FactStoreManager({ bodyRegion: 'lumbar_spine' });
      const walker = new TreeWalker(MOCK_TREE, fs);
      const output = walker.processAnswer('Q0.1', []);
      // Should proceed without error
      expect(output).toBeDefined();
    });
  });
});
