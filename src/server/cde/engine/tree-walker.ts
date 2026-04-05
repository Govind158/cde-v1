/**
 * Tree Walker — Decision tree traversal engine
 * Loads a decision tree and walks through it node by node.
 */

import type {
  DecisionTree,
  TreeQuestion,
  TreeLayer,
  TreeNode,
  TreeNodeQuestion,
  CDEOutput,
  AuditEntry,
  QuestionOption,
  Hypothesis,
  TreeProgress,
  GameRecommendation,
} from '@/types/cde';
import { FactStoreManager } from './fact-store';
import { evaluateRedFlags } from '../safety/red-flag-engine';
import { evaluateCriteria } from './rule-evaluator';
import { recommendGames } from '../interpreter/game-recommender';
import { getRedFlagById } from '../safety/red-flag-registry';

interface LayerState {
  layerIndex: number;
  questionIndex: number;
  score: number;
  maxScore: number;
  completed: boolean;
}

export class TreeWalker {
  private tree: DecisionTree;
  private factStore: FactStoreManager;
  private layerStates: Map<number, LayerState> = new Map();
  private currentLayerIndex: number = 0;
  private currentQuestionIndex: number = 0;
  private completed: boolean = false;
  private halted: boolean = false;
  private layerScores: Record<string, number> = {};
  private totalScore: number = 0;
  private generatedHypotheses: Hypothesis[] = [];
  private auditEntries: AuditEntry[] = [];
  private pendingConditionalQuestions: TreeQuestion[] = [];

  // ─── Node-based state (v3) ───
  private currentNodeId: string | null = null;
  private nodeQuestionIndex: number = 0;
  private pendingNodeFollowUp: TreeNodeQuestion | null = null;
  private waitingForGames: boolean = false;

  constructor(tree: DecisionTree, factStore: FactStoreManager) {
    this.tree = tree;
    this.factStore = factStore;

    // v3: If tree has nodes[], use node-based traversal
    if (tree.nodes && tree.nodes.length > 0) {
      this.currentNodeId = tree.nodes[0].id;
    }

    // Initialize layer states (legacy fallback)
    const layers = this.getLayerArray();
    layers.forEach((_, idx) => {
      this.layerStates.set(idx, {
        layerIndex: idx,
        questionIndex: 0,
        score: 0,
        maxScore: 0,
        completed: false,
      });
    });
  }

  // ═══════════════════════════════════════════════
  //  NODE-BASED TRAVERSAL (v3)
  // ═══════════════════════════════════════════════

  /** Returns true if this walker is operating in node-based mode */
  private get isNodeMode(): boolean {
    return this.currentNodeId !== null && (this.tree.nodes?.length ?? 0) > 0;
  }

  private getCurrentNodeObj(): TreeNode | null {
    if (!this.currentNodeId || !this.tree.nodes) return null;
    return this.tree.nodes.find((n) => n.id === this.currentNodeId) ?? null;
  }

  private getNodeById(nodeId: string): TreeNode | null {
    return this.tree.nodes?.find((n) => n.id === nodeId) ?? null;
  }

  private advanceToNode(nodeId: string): void {
    const previous = this.currentNodeId;
    this.currentNodeId = nodeId;
    this.nodeQuestionIndex = 0;
    this.pendingNodeFollowUp = null;
    this.makeAuditEntry('node_transition', {
      output: { fromNode: previous, toNode: nodeId },
    });
  }

  private buildCompletionOutput(): CDEOutput {
    this.completed = true;
    const audit = this.makeAuditEntry('assessment_complete');
    return {
      type: 'question',
      nextQuestion: {
        id: '__complete',
        text: 'Assessment complete',
        options: [],
        allowMultiple: false,
        uiType: 'radio',
      },
      auditEntry: audit,
    };
  }

  /** Convert a TreeNodeQuestion to the CDEOutput.nextQuestion shape the UI expects */
  private nodeQuestionToOutput(q: TreeNodeQuestion): CDEOutput {
    const audit = this.makeAuditEntry('question_presented', {
      nodeId: q.id,
      output: { node: this.currentNodeId, phase: this.getCurrentNodeObj()?.phase },
    });
    return {
      type: 'question',
      nextQuestion: {
        id: q.id,
        text: q.text,
        options: q.options ?? [],
        allowMultiple: q.allowMultiple ?? q.uiType === 'multi_select',
        // Map numeric_scale to slider for the UI
        uiType: q.uiType === 'numeric_scale' ? 'slider' : q.uiType as 'radio' | 'multi_select' | 'slider' | 'body_map',
      },
      auditEntry: audit,
    };
  }

  // ─── Node type handlers ───

  private handleRedFlagNode(node: TreeNode): CDEOutput {
    // Pending follow-up takes priority
    if (this.pendingNodeFollowUp) {
      return this.nodeQuestionToOutput(this.pendingNodeFollowUp);
    }

    const questions = node.questions ?? [];

    // Skip already-answered red flag questions (true/false already in factStore)
    while (this.nodeQuestionIndex < questions.length) {
      const q = questions[this.nodeQuestionIndex];
      if (q.mapsTo && this.isAlreadyPopulated(q.mapsTo)) {
        this.makeAuditEntry('question_auto_skipped', {
          nodeId: q.id,
          output: { node: node.id, mapsTo: q.mapsTo, reason: 'red_flag_already_screened' },
        });
        this.nodeQuestionIndex++;
        continue;
      }
      break;
    }

    if (this.nodeQuestionIndex >= questions.length) {
      // All red flags cleared — advance via on_all_clear
      if (node.on_all_clear) {
        this.advanceToNode(node.on_all_clear);
        return this.evaluateCurrentNode();
      }
      return this.buildCompletionOutput();
    }
    return this.nodeQuestionToOutput(questions[this.nodeQuestionIndex]);
  }

  private handleQuestionNode(node: TreeNode): CDEOutput {
    // Pending follow-up takes priority
    if (this.pendingNodeFollowUp) {
      return this.nodeQuestionToOutput(this.pendingNodeFollowUp);
    }

    const questions = node.questions ?? [];

    // Skip already-answered questions (except red flag nodes — handled separately)
    while (this.nodeQuestionIndex < questions.length) {
      const q = questions[this.nodeQuestionIndex];
      // Check showIf
      if (q.showIf && !this.evaluateShowIf(q.showIf)) {
        this.nodeQuestionIndex++;
        continue;
      }
      // Skip if already populated in factStore
      if (q.mapsTo && this.isAlreadyPopulated(q.mapsTo)) {
        this.makeAuditEntry('question_auto_skipped', {
          nodeId: q.id,
          output: { node: node.id, mapsTo: q.mapsTo },
        });
        this.nodeQuestionIndex++;
        continue;
      }
      break;
    }

    if (this.nodeQuestionIndex >= questions.length) {
      // All questions in this node answered — compute scoring if applicable
      if (node.scoring?.method === 'sum') {
        this.computeNodeSumScore(node);
      }
      // Advance to next node
      if (node.next) {
        this.advanceToNode(node.next);
        return this.evaluateCurrentNode();
      }
      return this.buildCompletionOutput();
    }

    return this.nodeQuestionToOutput(questions[this.nodeQuestionIndex]);
  }

  private handleHypothesisNode(node: TreeNode): CDEOutput {
    // NO questions — auto-evaluate rules and advance immediately
    const rules = node.rules ?? this.tree.hypothesisRules;
    const hypotheses: Hypothesis[] = [];

    for (const rule of rules) {
      const matched = evaluateCriteria(rule.criteria, this.factStore.getStore());
      if (matched) {
        hypotheses.push({
          conditionId: rule.id,
          subtype: null,
          confidence: rule.confidence,
          recommendedGames: rule.recommendedGames,
          contraindicatedGames: rule.contraindicatedGames,
          displayName: rule.displayName,
        });
      }
      this.makeAuditEntry('hypothesis_evaluated', {
        ruleId: rule.id,
        factsEvaluated: rule.criteria as unknown as Record<string, unknown>,
        ruleFired: matched,
      });
    }

    this.generatedHypotheses = hypotheses;
    this.factStore.update({ activeHypotheses: hypotheses } as Record<string, unknown>);

    // Collect all recommended games for downstream nodes
    const allGames = hypotheses.flatMap((h) => h.recommendedGames);
    this.factStore.set('recommendedGames', [...new Set(allGames)]);

    this.makeAuditEntry('hypothesis_generation_complete', {
      output: {
        matched: hypotheses.map((h) => h.conditionId),
        totalGamesRecommended: allGames.length,
      },
    });

    // Auto-advance
    if (node.next) {
      this.advanceToNode(node.next);
      return this.evaluateCurrentNode();
    }
    return this.buildCompletionOutput();
  }

  private handleAssessmentNode(node: TreeNode): CDEOutput {
    // NO questions — use the game recommender pipeline (Tree 5)
    const riskLevel = (this.factStore.get('riskLevel') as string) ?? 'GREEN';
    const completedGames = (this.factStore.get('completedGames') as string[]) ?? [];
    const conditionTags = (this.factStore.get('conditionTags') as string[]) ?? [];
    const maxGames = node.maxGamesPerSession ?? 3;

    const recommendations = recommendGames(
      this.generatedHypotheses,
      riskLevel as import('@/types/cde').RiskLevel,
      completedGames,
      conditionTags,
      maxGames
    );

    // Store where to resume after games
    if (node.next_after_games) {
      this.factStore.set('afterGamesNode', node.next_after_games);
    }

    if (recommendations.length > 0) {
      this.waitingForGames = true;
      const audit = this.makeAuditEntry('game_recommendation', {
        output: { games: recommendations.map((r) => r.gameId), maxGames },
      });

      return {
        type: 'game_recommendation',
        games: recommendations,
        auditEntry: audit,
      };
    }

    // No games to recommend — skip to interpretation
    if (node.next_after_games) {
      this.advanceToNode(node.next_after_games);
      return this.evaluateCurrentNode();
    }
    return this.buildCompletionOutput();
  }

  private handleInterpretationNode(node: TreeNode): CDEOutput {
    // NO questions — score interpretation is handled externally by CDEEngine.
    // Auto-advance to care matching.
    // Full implementation wired in Phase 4 Step 4.2.
    if (node.next) {
      this.advanceToNode(node.next);
      return this.evaluateCurrentNode();
    }
    return this.buildCompletionOutput();
  }

  private handleCareNode(_node: TreeNode): CDEOutput {
    // FINAL node — care matching is handled externally by CDEEngine.
    // Full implementation wired in Phase 4 Step 4.2.
    return this.buildCompletionOutput();
  }

  /** Compute sum scoring for functional_assessment nodes */
  private computeNodeSumScore(node: TreeNode): void {
    if (!node.scoring) return;
    const questions = node.questions ?? [];
    let sum = 0;
    for (const q of questions) {
      const val = this.factStore.get(q.mapsTo);
      if (typeof val === 'number') {
        sum += val;
      } else if (typeof val === 'string') {
        const num = parseInt(val, 10);
        if (!isNaN(num)) sum += num;
      }
    }
    this.factStore.set(node.scoring.mapsTo, sum);

    // Classify via interpretation ranges
    for (const [range, label] of Object.entries(node.scoring.interpretation)) {
      const [minStr, maxStr] = range.split('-');
      const min = parseInt(minStr, 10);
      const max = parseInt(maxStr, 10);
      if (sum >= min && sum <= max) {
        this.factStore.set(node.scoring.interpretationMapsTo, label);
        break;
      }
    }

    this.makeAuditEntry('functional_score_computed', {
      output: { score: sum, node: node.id, mapsTo: node.scoring.mapsTo },
    });
  }

  /**
   * Process a structured answer for a node-based question.
   * Returns the next CDEOutput after handling the answer.
   */
  private processNodeAnswer(questionId: string, answer: string | string[]): CDEOutput {
    const node = this.getCurrentNodeObj();
    if (!node) return this.buildCompletionOutput();

    const answers = Array.isArray(answer) ? answer : [answer];
    const firstAnswer = answers[0]?.toLowerCase() ?? '';
    const isYes = firstAnswer === 'yes' || firstAnswer === 'true';

    // ── Find the question ──
    let question: TreeNodeQuestion | null = null;

    // Check if it's the pending follow-up
    if (this.pendingNodeFollowUp?.id === questionId) {
      question = this.pendingNodeFollowUp;
    } else {
      // Find in current node's questions
      question = (node.questions ?? []).find((q) => q.id === questionId) ?? null;
      // Also check follow_up_if_yes on each question
      if (!question) {
        for (const q of node.questions ?? []) {
          if (q.follow_up_if_yes?.id === questionId) {
            question = q.follow_up_if_yes;
            break;
          }
        }
      }
    }

    if (!question) {
      const audit = this.makeAuditEntry('error', { output: { error: 'node_question_not_found', questionId } });
      return {
        type: 'question',
        nextQuestion: { id: '__error', text: 'Question not found', options: [], allowMultiple: false, uiType: 'radio' },
        auditEntry: audit,
      };
    }

    // ── Store answer in factStore ──
    if (question.mapsTo) {
      if (question.allowMultiple) {
        this.factStore.set(question.mapsTo, answers);
      } else if (question.uiType === 'numeric_scale') {
        const numVal = parseFloat(answers[0]);
        this.factStore.set(question.mapsTo, isNaN(numVal) ? answers[0] : numVal);
      } else {
        this.factStore.set(question.mapsTo, answers[0]);
      }
    }

    this.makeAuditEntry('question_answered', {
      nodeId: questionId,
      output: { node: node.id, answer: answers },
    });

    // ── Clear pending follow-up if this was it ──
    const wasFollowUp = this.pendingNodeFollowUp?.id === questionId;
    if (wasFollowUp) {
      this.pendingNodeFollowUp = null;
    }

    // ── Handle red flag if_yes / if_no ──
    if (question.if_yes && isYes) {
      if (question.if_yes.halt_tree) {
        this.halted = true;
        const audit = this.makeAuditEntry('session_halted', {
          ruleId: questionId,
          ruleFired: true,
          output: { urgency: question.if_yes.urgency, flag: questionId },
        });
        return {
          type: 'red_flag_halt',
          emergency: {
            flagId: questionId,
            urgency: question.if_yes.urgency as 'immediate' | 'urgent_24h' | 'urgent_48h' | 'specialist_2_4_weeks',
            message: question.if_yes.message,
            action: question.if_yes.action ?? 'Seek medical attention.',
          },
          auditEntry: audit,
        };
      }
      // Non-halting flag (e.g., FLAG_AND_CONTINUE)
      if (question.if_yes.flag) {
        this.factStore.set(`flags.${question.if_yes.flag}`, true);
      }
    }

    // ── Handle if_no action (store clinical recommendation) ──
    if (question.if_no && !isYes) {
      if (question.if_no.action) {
        this.factStore.set(`recommendations.${questionId}`, question.if_no.action);
        this.makeAuditEntry('clinical_recommendation_stored', {
          nodeId: questionId,
          output: { action: question.if_no.action },
        });
      }
    }

    // ── Handle follow_up_if_yes ──
    if (question.follow_up_if_yes && isYes && !wasFollowUp) {
      this.pendingNodeFollowUp = question.follow_up_if_yes;
      return this.evaluateCurrentNode();
    }

    // ── Handle branching to another NODE ──
    // IMPORTANT: Only branch on EXPLICIT answer match — "default" is not auto-followed.
    // This ensures remaining questions in the current node are not accidentally skipped.
    if (question.branching) {
      const branchTarget = question.branching[answers[0]];
      if (branchTarget && !branchTarget.startsWith('__')) {
        // Branch to another node
        this.advanceToNode(branchTarget);
        return this.evaluateCurrentNode();
      }
      // __follow_up_ prefix means queue the follow-up from this question
      if (branchTarget?.startsWith('__follow_up_') && question.follow_up_if_yes) {
        this.pendingNodeFollowUp = question.follow_up_if_yes;
        return this.evaluateCurrentNode();
      }
    }

    // ── Advance to next question in node ──
    if (!wasFollowUp) {
      this.nodeQuestionIndex++;
    }

    return this.evaluateCurrentNode();
  }

  /**
   * Resume tree traversal after all games have been played.
   * Called by CDEEngine when the last game result is submitted.
   */
  resumeAfterGames(): CDEOutput {
    this.waitingForGames = false;
    const afterNode = this.factStore.get('afterGamesNode') as string | null;
    if (afterNode) {
      this.advanceToNode(afterNode);
      return this.evaluateCurrentNode();
    }
    return this.buildCompletionOutput();
  }

  // ═══════════════════════════════════════════════
  //  LEGACY LAYER-BASED TRAVERSAL (v1 fallback)
  // ═══════════════════════════════════════════════

  private getLayerArray(): TreeLayer[] {
    if (!this.tree.layers) return [];
    return [
      this.tree.layers.layer0,
      this.tree.layers.layer1,
      this.tree.layers.layer2,
      this.tree.layers.layer3,
    ].filter(Boolean);
  }

  private getCurrentLayer(): TreeLayer {
    return this.getLayerArray()[this.currentLayerIndex];
  }

  private getCurrentQuestion(): TreeQuestion | null {
    // Check for pending conditional questions first (branch questions are always asked)
    if (this.pendingConditionalQuestions.length > 0) {
      return this.pendingConditionalQuestions[0];
    }

    const layer = this.getCurrentLayer();
    if (!layer || this.currentQuestionIndex >= layer.questions.length) {
      return null;
    }

    const question = layer.questions[this.currentQuestionIndex];

    // Check showIf condition
    if (question.showIf) {
      if (!this.evaluateShowIf(question.showIf)) {
        this.currentQuestionIndex++;
        return this.getCurrentQuestion();
      }
    }

    // Skip questions whose answer is already in the FactStore.
    // Layer 0 (red flag screen) is ALWAYS asked — patient safety is non-negotiable.
    if (this.currentLayerIndex > 0 && question.mapsTo) {
      if (this.isAlreadyPopulated(question.mapsTo)) {
        this.autoScoreSkippedQuestion(question);
        this.currentQuestionIndex++;
        return this.getCurrentQuestion();
      }
    }

    return question;
  }

  /**
   * Returns true if the FactStore already has meaningful data at the given path.
   */
  private isAlreadyPopulated(mapsTo: string): boolean {
    const value = this.factStore.get(mapsTo);
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return true;
    if (typeof value === 'boolean') return true;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value as object).length > 0;
    return false;
  }

  /**
   * When skipping a question because its answer is already known, apply best-effort scoring
   * by matching stored FactStore values against the question's option values.
   */
  private autoScoreSkippedQuestion(question: TreeQuestion): void {
    const layerState = this.layerStates.get(this.currentLayerIndex);
    if (!layerState || !question.mapsTo) return;

    const stored = this.factStore.get(question.mapsTo);
    const storedValues: string[] = Array.isArray(stored)
      ? stored.map(String)
      : stored !== null && stored !== undefined
        ? [String(stored)]
        : [];

    let score = 0;
    let matched = false;

    for (const val of storedValues) {
      const option = question.options.find(
        (o) => o.value.toLowerCase() === val.toLowerCase()
      );
      if (option) {
        score += option.score ?? 0;
        matched = true;
      }
    }

    if (question.scoreCap !== undefined) {
      score = Math.min(score, question.scoreCap);
    }

    layerState.score += score;
    // Only count toward maxScore if we found a matching option — preserves normalisation accuracy
    if (matched) {
      layerState.maxScore += question.maxScore;
    }

    this.makeAuditEntry('question_auto_skipped', {
      nodeId: question.id,
      layer: this.currentLayerIndex,
      factsEvaluated: {
        mapsTo: question.mapsTo,
        storedValue: stored,
        matchedOptions: matched,
        autoScore: score,
      },
      ruleFired: matched,
    });
  }

  private evaluateShowIf(condition: string): boolean {
    // Parse conditions like "duration in ['subacute_6_12_weeks', 'chronic_over_12_weeks']"
    const inMatch = condition.match(/^(\w+(?:\.\w+)*)\s+in\s+\[(.+)\]$/);
    if (inMatch) {
      const field = inMatch[1];
      const valuesStr = inMatch[2];
      const values = valuesStr.split(',').map((v) => v.trim().replace(/'/g, ''));
      const fieldValue = this.factStore.get(field);
      return values.includes(fieldValue as string);
    }

    // Simple equality: "field == value"
    const eqMatch = condition.match(/^(\w+(?:\.\w+)*)\s*==\s*'?(.+?)'?$/);
    if (eqMatch) {
      const fieldValue = this.factStore.get(eqMatch[1]);
      return String(fieldValue) === eqMatch[2];
    }

    return true; // Default: show the question
  }

  private makeAuditEntry(
    eventType: string,
    overrides: Partial<AuditEntry> = {}
  ): AuditEntry {
    const entry: AuditEntry = {
      sessionId: '',
      timestamp: new Date().toISOString(),
      eventType,
      factsEvaluated: {},
      ruleFired: false,
      output: {},
      engineVersion: '1.0.0',
      treeVersion: this.tree.version,
      ...overrides,
    };
    this.auditEntries.push(entry);
    return entry;
  }

  getCurrentNode(): TreeQuestion | null {
    return this.getCurrentQuestion();
  }

  evaluateCurrentNode(): CDEOutput {
    if (this.halted || this.completed) {
      const audit = this.makeAuditEntry('status_check');
      return {
        type: 'question',
        nextQuestion: {
          id: '__completed',
          text: this.halted ? 'Session halted' : 'Session completed',
          options: [],
          allowMultiple: false,
          uiType: 'radio',
        },
        auditEntry: audit,
      };
    }

    // ─── NODE-BASED DISPATCH (v3 — takes priority) ───
    if (this.tree.nodes && this.tree.nodes.length > 0 && this.currentNodeId) {
      if (this.waitingForGames) {
        // Waiting for game results — return a sentinel so the engine knows
        const audit = this.makeAuditEntry('waiting_for_games');
        return {
          type: 'question',
          nextQuestion: { id: '__waiting_for_games', text: 'Waiting for assessment results', options: [], allowMultiple: false, uiType: 'radio' },
          auditEntry: audit,
        };
      }

      const node = this.getCurrentNodeObj();
      if (!node) return this.buildCompletionOutput();

      switch (node.type) {
        case 'red_flag_screen':
          return this.handleRedFlagNode(node);
        case 'symptom_profiling':
        case 'functional_assessment':
        case 'differential_assessment':
          return this.handleQuestionNode(node);
        case 'hypothesis_generation':
          return this.handleHypothesisNode(node);
        case 'assessment_recommendation':
          return this.handleAssessmentNode(node);
        case 'score_interpretation':
          return this.handleInterpretationNode(node);
        case 'care_pathway_matching':
          return this.handleCareNode(node);
        default:
          return this.handleQuestionNode(node);
      }
    }

    // ─── LEGACY LAYER-BASED DISPATCH (v1 fallback) ───
    const question = this.getCurrentQuestion();
    if (!question) {
      return this.advanceLayer();
    }

    const audit = this.makeAuditEntry('question_presented', {
      nodeId: question.id,
      layer: this.currentLayerIndex,
    });

    return {
      type: 'question',
      nextQuestion: {
        id: question.id,
        text: question.text,
        options: question.options,
        allowMultiple: question.allowMultiple || question.uiType === 'multi_select',
        uiType: question.uiType,
      },
      auditEntry: audit,
    };
  }

  processAnswer(questionId: string, answer: string | string[]): CDEOutput {
    // ─── NODE-BASED ANSWER PROCESSING (v3) ───
    if (this.isNodeMode) {
      return this.processNodeAnswer(questionId, answer);
    }

    // ─── LEGACY LAYER-BASED (v1 fallback) ───
    const question = this.findQuestion(questionId);
    if (!question) {
      const audit = this.makeAuditEntry('error', { output: { error: 'question_not_found', questionId } });
      return {
        type: 'question',
        nextQuestion: { id: '__error', text: 'Question not found', options: [], allowMultiple: false, uiType: 'radio' },
        auditEntry: audit,
      };
    }

    const answers = Array.isArray(answer) ? answer : [answer];

    // Calculate score
    let score = 0;
    const selectedOptions: QuestionOption[] = [];
    for (const ans of answers) {
      const option = question.options.find(
        (o) => o.value.toLowerCase() === ans.toLowerCase() || o.label.toLowerCase() === ans.toLowerCase()
      );
      if (option) {
        selectedOptions.push(option);
        score += option.score ?? 0;
      }
    }

    // Apply score cap if defined
    if (question.scoreCap !== undefined) {
      score = Math.min(score, question.scoreCap);
    }

    // Update layer score
    const layerState = this.layerStates.get(this.currentLayerIndex)!;
    layerState.score += score;
    layerState.maxScore += question.maxScore;

    // Update fact store with answer mapping
    if (question.mapsTo) {
      const mappedValue = answers.length === 1 ? this.mapAnswerToFact(answers[0], question) : answers;
      this.factStore.set(question.mapsTo, mappedValue);
    }

    // Log the answer
    this.makeAuditEntry('question_answered', {
      nodeId: questionId,
      layer: this.currentLayerIndex,
      factsEvaluated: { answer: answers, score },
      ruleFired: score > 0,
    });

    // Layer 0 special handling: check red flags after every answer
    if (this.currentLayerIndex === 0) {
      // Check for red flag halt rules on selected options
      if (question.redFlagHalt) {
        for (const ans of answers) {
          const haltFlagId = question.redFlagHalt[ans];
          if (haltFlagId) {
            return this.haltSession(haltFlagId);
          }
        }
      }

      // Also run the red flag engine
      const redFlagResult = evaluateRedFlags(this.factStore.getStore());
      if (redFlagResult.triggered) {
        const highestFlag = redFlagResult.flags[0];
        return this.haltSession(highestFlag.flagId, highestFlag);
      }
    }

    // Check for branching
    for (const option of selectedOptions) {
      if (option.branchTo) {
        const branchQuestion = this.findQuestionInTree(option.branchTo);
        if (branchQuestion) {
          this.pendingConditionalQuestions.push(branchQuestion);
        }
      }
    }

    // Check for branching rules on the question itself
    if (question.branching) {
      for (const ans of answers) {
        const branchTarget = question.branching[ans];
        if (branchTarget) {
          const branchQ = this.findQuestionInTree(branchTarget);
          if (branchQ) {
            this.pendingConditionalQuestions.push(branchQ);
          }
        }
      }
    }

    // Remove from pending if this was a conditional question
    if (this.pendingConditionalQuestions.length > 0 && this.pendingConditionalQuestions[0].id === questionId) {
      this.pendingConditionalQuestions.shift();
    } else {
      // Advance to next question in the layer
      this.currentQuestionIndex++;
    }

    // Return next output
    return this.evaluateCurrentNode();
  }

  private findQuestion(questionId: string): TreeQuestion | null {
    // Check pending conditional questions first
    const pending = this.pendingConditionalQuestions.find((q) => q.id === questionId);
    if (pending) return pending;

    // Check current layer
    const layer = this.getCurrentLayer();
    if (layer) {
      const found = layer.questions.find((q) => q.id === questionId);
      if (found) return found;

      // Check sections within questions
      for (const q of layer.questions) {
        if (q.sections) {
          const sectionQ = q.sections.find((s) => s.id === questionId);
          if (sectionQ) return sectionQ;
        }
      }
    }

    return this.findQuestionInTree(questionId);
  }

  private findQuestionInTree(questionId: string): TreeQuestion | null {
    for (const layer of this.getLayerArray()) {
      for (const q of layer.questions) {
        if (q.id === questionId) return q;
        if (q.sections) {
          const sectionQ = q.sections.find((s) => s.id === questionId);
          if (sectionQ) return sectionQ;
        }
      }
    }
    return null;
  }

  private mapAnswerToFact(answer: string, question: TreeQuestion): unknown {
    // Map specific answer values to fact store values
    const option = question.options.find(
      (o) => o.value.toLowerCase() === answer.toLowerCase()
    );
    return option?.value ?? answer;
  }

  private advanceLayer(): CDEOutput {
    // Mark current layer as completed
    const currentState = this.layerStates.get(this.currentLayerIndex);
    if (currentState) {
      currentState.completed = true;

      // Calculate weighted layer score
      const layerKey = `layer${this.currentLayerIndex}`;
      const weight = this.tree.architecture.scoringWeights[layerKey] ?? 0;
      const maxScore = currentState.maxScore || 1;
      const weightedScore = (currentState.score / maxScore) * weight;
      this.layerScores[layerKey] = weightedScore;
    }

    // Move to next layer
    this.currentLayerIndex++;
    this.currentQuestionIndex = 0;

    if (this.currentLayerIndex >= this.getLayerArray().length) {
      // All layers complete — generate hypotheses and compute risk
      return this.completeAssessment();
    }

    // Present first question of next layer
    return this.evaluateCurrentNode();
  }

  private completeAssessment(): CDEOutput {
    this.completed = true;

    // Calculate total score
    this.totalScore = Object.values(this.layerScores).reduce((sum, s) => sum + s, 0);

    // Determine risk tier
    const thresholds = this.tree.riskTierThresholds;
    let riskTier: 'GREEN' | 'YELLOW' | 'ORANGE' = 'GREEN';
    if (this.totalScore >= thresholds.high[0]) {
      riskTier = 'ORANGE';
    } else if (this.totalScore >= thresholds.moderate[0]) {
      riskTier = 'YELLOW';
    }

    // Generate hypotheses
    this.generatedHypotheses = this.evaluateHypothesisRules();

    // Update fact store
    this.factStore.set('riskLevel', riskTier);
    this.factStore.update({ activeHypotheses: this.generatedHypotheses });

    this.makeAuditEntry('assessment_completed', {
      factsEvaluated: {
        totalScore: this.totalScore,
        layerScores: this.layerScores,
        riskTier,
      },
      output: {
        hypotheses: this.generatedHypotheses.map((h) => h.conditionId),
      },
    });

    // Return game recommendation based on hypotheses
    const games = this.collectRecommendedGames();

    if (games.length > 0) {
      const audit = this.makeAuditEntry('game_recommendation', {
        output: { games: games.map((g) => g.gameId) },
      });

      return {
        type: 'game_recommendation',
        games,
        auditEntry: audit,
      };
    }

    // If no games, return care recommendation directly
    const audit = this.makeAuditEntry('assessment_complete');
    return {
      type: 'question',
      nextQuestion: {
        id: '__complete',
        text: 'Assessment complete',
        options: [],
        allowMultiple: false,
        uiType: 'radio',
      },
      auditEntry: audit,
    };
  }

  private evaluateHypothesisRules(): Hypothesis[] {
    const hypotheses: Hypothesis[] = [];

    for (const rule of this.tree.hypothesisRules) {
      const matched = evaluateCriteria(rule.criteria, this.factStore.getStore());
      if (matched) {
        hypotheses.push({
          conditionId: rule.id,
          subtype: null,
          confidence: rule.confidence,
          recommendedGames: rule.recommendedGames,
          contraindicatedGames: rule.contraindicatedGames,
          displayName: rule.displayName,
        });
      }

      this.makeAuditEntry('hypothesis_evaluated', {
        ruleId: rule.id,
        factsEvaluated: rule.criteria as unknown as Record<string, unknown>,
        ruleFired: matched,
      });
    }

    return hypotheses;
  }

  private collectRecommendedGames(): { gameId: string; parameter: string; purpose: string; estimatedDuration: number; contraindicationNote?: string }[] {
    const gameSet = new Map<string, { gameId: string; parameter: string; purpose: string; estimatedDuration: number; contraindicationNote?: string }>();
    const contraindicatedIds = new Set<string>();

    // Collect contraindicated games
    for (const hyp of this.generatedHypotheses) {
      for (const gameId of hyp.contraindicatedGames) {
        contraindicatedIds.add(gameId);
      }
    }

    // Collect recommended games (excluding contraindicated)
    for (const hyp of this.generatedHypotheses) {
      for (const gameId of hyp.recommendedGames) {
        if (!contraindicatedIds.has(gameId) && !gameSet.has(gameId)) {
          gameSet.set(gameId, {
            gameId,
            parameter: gameId,
            purpose: `Recommended based on ${hyp.displayName}`,
            estimatedDuration: 60,
          });
        }
      }
    }

    return Array.from(gameSet.values());
  }

  private haltSession(flagId: string, flag?: { flagId: string; urgency: string; haltMessage: string; haltAction: string }): CDEOutput {
    this.halted = true;

    const audit = this.makeAuditEntry('session_halted', {
      ruleId: flagId,
      ruleFired: true,
      output: { flagId, urgency: flag?.urgency ?? 'immediate' },
    });

    const flagDef = flag || getRedFlagById(flagId);

    return {
      type: 'red_flag_halt',
      emergency: {
        flagId,
        urgency: (flagDef?.urgency ?? 'immediate') as 'immediate' | 'urgent_24h' | 'urgent_48h' | 'specialist_2_4_weeks',
        message: flagDef?.haltMessage ?? 'Your responses indicate a condition that requires immediate medical attention.',
        action: flagDef?.haltAction ?? 'Please seek immediate medical care.',
      },
      auditEntry: audit,
    };
  }

  getProgress(): TreeProgress {
    // ─── Node-based progress ───
    if (this.isNodeMode && this.tree.nodes) {
      const nodes = this.tree.nodes;
      const currentIdx = nodes.findIndex((n) => n.id === this.currentNodeId);
      const totalNodes = nodes.length;
      // Count total question-bearing nodes for a rough percentage
      const questionNodes = nodes.filter((n) => (n.questions?.length ?? 0) > 0);
      const completedQuestionNodes = questionNodes.filter((n) => {
        const idx = nodes.indexOf(n);
        return idx < currentIdx;
      }).length;
      const percent = questionNodes.length > 0
        ? Math.round((completedQuestionNodes / questionNodes.length) * 100)
        : 0;

      return {
        currentLayer: currentIdx,
        totalLayers: totalNodes,
        percentComplete: this.completed ? 100 : percent,
      };
    }

    // ─── Legacy layer-based progress ───
    const layers = this.getLayerArray();
    const totalQuestions = layers.reduce((sum, l) => sum + l.questions.length, 0);
    let answeredQuestions = 0;

    for (let i = 0; i < this.currentLayerIndex; i++) {
      answeredQuestions += layers[i].questions.length;
    }
    answeredQuestions += this.currentQuestionIndex;

    return {
      currentLayer: this.currentLayerIndex,
      totalLayers: layers.length,
      percentComplete: totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0,
    };
  }

  isComplete(): boolean {
    return this.completed || this.halted;
  }

  isHalted(): boolean {
    return this.halted;
  }

  getLayerScores(): Record<string, number> {
    return { ...this.layerScores };
  }

  getTotalScore(): number {
    return this.totalScore;
  }

  getHypotheses(): Hypothesis[] {
    return [...this.generatedHypotheses];
  }

  getAuditEntries(): AuditEntry[] {
    return [...this.auditEntries];
  }

  /** Returns the minimal state needed to restore this walker's position from DB */
  getWalkerState(): { currentNodeId: string | null; nodeQuestionIndex: number; waitingForGames: boolean } {
    return {
      currentNodeId: this.currentNodeId,
      nodeQuestionIndex: this.nodeQuestionIndex,
      waitingForGames: this.waitingForGames,
    };
  }

  /** Restore walker position after cold reconstruction from DB */
  restoreState(state: { currentNodeId: string | null; nodeQuestionIndex: number; waitingForGames: boolean }): void {
    if (state.currentNodeId) {
      this.currentNodeId = state.currentNodeId;
    }
    this.nodeQuestionIndex = state.nodeQuestionIndex;
    this.waitingForGames = state.waitingForGames;
  }
}
