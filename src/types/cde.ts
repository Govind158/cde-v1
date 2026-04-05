/**
 * CDE TypeScript Interfaces
 * Complete type definitions for the Kriya Clinical Decision Engine.
 * This file defines EVERY type used across the CDE.
 * Convention: PascalCase for interfaces, camelCase for fields, union types (no enums).
 */

// ─────────────────────────────────────────────
// 15. Risk Level — color-coded risk classification
// ─────────────────────────────────────────────
export type RiskLevel = 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE';

// ─────────────────────────────────────────────
// 16. Risk Tier — actionable risk tier
// ─────────────────────────────────────────────
export type RiskTier = 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE';

export interface RiskTierConfig {
  action: string;
  gamesAllowed: boolean;
  highIntensityAllowed: boolean;
  referral: string | null;
  description: string;
}

export const RISK_TIER_ACTIONS: Record<RiskLevel, RiskTierConfig> = {
  RED: {
    action: 'halt_assessment',
    gamesAllowed: false,
    highIntensityAllowed: false,
    referral: 'emergency',
    description: 'Stop assessment. Direct to emergency or urgent medical care.',
  },
  ORANGE: {
    action: 'continue_with_caution',
    gamesAllowed: true,
    highIntensityAllowed: false,
    referral: 'within_1_2_weeks',
    description: 'Continue assessment but recommend clinical evaluation within 1-2 weeks.',
  },
  YELLOW: {
    action: 'full_assessment_guided',
    gamesAllowed: true,
    highIntensityAllowed: true,
    referral: null,
    description: 'Full assessment with games. Recommend guided care program with professional oversight.',
  },
  GREEN: {
    action: 'full_assessment_self',
    gamesAllowed: true,
    highIntensityAllowed: true,
    referral: null,
    description: 'Full assessment with games. Self-guided program appropriate.',
  },
  BLUE: {
    action: 'performance_benchmark',
    gamesAllowed: true,
    highIntensityAllowed: true,
    referral: null,
    description: 'Performance assessment. Benchmark and track. Optimization recommendations.',
  },
};

// ─────────────────────────────────────────────
// 2. GameScoreEntry — result from a single assessment game
// ─────────────────────────────────────────────
export interface GameScoreEntry {
  rawScore: number;
  percentile: number;
  /** Normative band placement relative to age/sex peers */
  band: 'below_10' | '10_to_25' | '25_to_75' | 'above_75';
  interpretation: string;
}

// ─────────────────────────────────────────────
// 1. FactStore — the session state object
// ─────────────────────────────────────────────
export interface FactStore {
  // User context
  age: number | null;
  sex: 'male' | 'female' | 'other' | null;
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | null;
  /** User-stated rehabilitation or health goals */
  userGoals: string[];

  // Symptom data
  bodyRegion: string | null;
  conditionMentioned: string | null;
  symptom: string | null;
  /** Pain severity on 0-10 scale. MUST be explicitly asked, never inferred. */
  severity: number | null;
  duration: 'acute_0_6_weeks' | 'subacute_6_12_weeks' | 'chronic_over_12_weeks' | null;
  onset: string | null;
  aggravatingFactors: string[];
  easingFactors: string[];
  radiation: string | null;
  painPattern: string[];
  painQuality: string[];

  // Neurological signals
  numbness: boolean | null;
  tingling: boolean | null;
  weakness: boolean | null;
  /** Loss of bladder/bowel control — critical red flag signal */
  bowelBladderChange: boolean | null;
  balanceAffected: boolean | null;

  // Red flag responses
  redFlags: Record<string, boolean | null>;

  // Functional impact (0-3 scale each)
  functionalImpact: {
    sleep: number | null;
    work: number | null;
    exercise: number | null;
    adl: number | null;
  };

  // Imaging history
  imaging: {
    hasImaging: boolean | null;
    type: string | null;
    finding: string | null;
    level: string | null;
    recencyMonths: number | null;
  };

  // Game scores
  gameScores: Record<string, GameScoreEntry>;

  // CDE computed fields
  riskLevel: RiskLevel | null;
  activeHypotheses: Hypothesis[];
  conditionTags: string[];
  crossScanTags: string[];
  completedGames: string[];

  // Pre-populated context from previous scans
  prePopulatedContext: Record<string, unknown>;

  // Prior conditions
  priorConditions: string | null;

  // Medical history
  medicalHistory: {
    diabetes: boolean | null;
    cancer: boolean | null;
    osteoporosis: boolean | null;
    rheumatoidArthritis: boolean | null;
  };

  // Morning stiffness duration (minutes)
  morningStiffnessDuration: number | null;
}

// ─────────────────────────────────────────────
// 3. Hypothesis — a possible clinical condition
// ─────────────────────────────────────────────
export interface Hypothesis {
  conditionId: string;
  subtype: string | null;
  confidence: 'high' | 'medium' | 'low';
  recommendedGames: string[];
  contraindicatedGames: string[];
  displayName: string;
}

// ─────────────────────────────────────────────
// 5. QuestionOption — single answer option
// ─────────────────────────────────────────────
export interface QuestionOption {
  label: string;
  value: string;
  score?: number;
  branchTo?: string;
}

// ─────────────────────────────────────────────
// 6. AuditEntry — single audit log record
// ─────────────────────────────────────────────
export interface AuditEntry {
  sessionId: string;
  timestamp: string;
  eventType: string;
  layer?: number;
  nodeId?: string;
  ruleId?: string;
  factsEvaluated: Record<string, unknown>;
  ruleFired: boolean;
  output: Record<string, unknown>;
  engineVersion: string;
  treeVersion: string;
}

// ─────────────────────────────────────────────
// 4. CDEOutput — discriminated union of all CDE outputs
// ─────────────────────────────────────────────
export interface CDEQuestionOutput {
  type: 'question';
  nextQuestion: {
    id: string;
    text: string;
    options: QuestionOption[];
    allowMultiple: boolean;
    uiType: 'radio' | 'multi_select' | 'slider' | 'body_map';
  };
  auditEntry: AuditEntry;
}

export interface CDERedFlagHaltOutput {
  type: 'red_flag_halt';
  emergency: {
    flagId: string;
    urgency: 'immediate' | 'urgent_24h' | 'urgent_48h' | 'specialist_2_4_weeks';
    message: string;
    action: string;
  };
  auditEntry: AuditEntry;
}

export interface CDEGameRecommendationOutput {
  type: 'game_recommendation';
  games: {
    gameId: string;
    parameter: string;
    parameterDisplayName?: string;
    purpose: string;
    estimatedDuration: number;
    estimatedDurationSeconds?: number;
    priority?: number;
    contraindicationNote?: string | null;
  }[];
  auditEntry: AuditEntry;
}

export interface CDEScoreInterpretationOutput {
  type: 'score_interpretation';
  interpretation: {
    gameId: string;
    rawScore: number;
    percentile: number;
    band: 'below_10' | '10_to_25' | '25_to_75' | 'above_75';
    clinicalRelevance: string;
    trend?: 'improved' | 'declined' | 'stable';
    patientSummary: string;
  };
  auditEntry: AuditEntry;
}

export interface CDECareRecommendationOutput {
  type: 'care_recommendation';
  care: {
    pathwayId: string;
    name: string;
    description: string;
    providerTypes: string[];
    durationWeeks: number;
    rationale: string;
    alternatives: {
      pathwayId: string;
      name: string;
      description: string;
    }[];
  };
  auditEntry: AuditEntry;
}

export interface CDECrossScanOutput {
  type: 'cross_scan';
  crossScan: {
    targetModule: string;
    reason: string;
    prePopulatedTags: string[];
  };
  auditEntry: AuditEntry;
}

export type CDEOutput =
  | CDEQuestionOutput
  | CDERedFlagHaltOutput
  | CDEGameRecommendationOutput
  | CDEScoreInterpretationOutput
  | CDECareRecommendationOutput
  | CDECrossScanOutput;

// ─────────────────────────────────────────────
// 14. CriterionItem — single evaluation criterion
// ─────────────────────────────────────────────
export interface CriterionItem {
  field: string;
  equals?: string | number | boolean;
  contains?: string;
  containsAny?: string[];
  lessThan?: number;
  greaterThan?: number;
  between?: [number, number];
  exists?: boolean;
  notExists?: boolean;
}

// ─────────────────────────────────────────────
// 13. MatchCriteria — criteria groups with combinators
// ─────────────────────────────────────────────
export interface MatchCriteria {
  ALL?: CriterionItem[];
  ANY?: CriterionItem[];
  NONE?: CriterionItem[];
}

// ─────────────────────────────────────────────
// 7a. TreeNode — node-based decision tree types (v3)
// ─────────────────────────────────────────────
export type TreeNodeType =
  | 'red_flag_screen'
  | 'symptom_profiling'
  | 'functional_assessment'
  | 'differential_assessment'
  | 'hypothesis_generation'
  | 'assessment_recommendation'
  | 'score_interpretation'
  | 'care_pathway_matching';

export interface RedFlagAction {
  urgency: 'emergency' | 'urgent_24h' | 'urgent_1_week' | 'urgent_48h' | 'flag_and_continue';
  message: string;
  halt_tree: boolean;
  flag?: string;
  action?: string;
}

export interface TreeNodeQuestion {
  id: string;
  text: string;
  uiType: 'radio' | 'multi_select' | 'slider' | 'numeric_scale';
  inputType?: string;
  range?: [number, number];
  options?: QuestionOption[];
  allowMultiple?: boolean;
  mapsTo: string;
  sourceInstrument?: string;
  showIf?: string;
  branching?: Record<string, string>;
  if_yes?: RedFlagAction;
  if_no?: { action: string };
  follow_up_if_yes?: TreeNodeQuestion;
  clinicalSignificance?: Record<string, string>;
  scoreCap?: number;
  maxScore?: number;
}

export interface NodeScoring {
  method: 'sum' | 'weighted' | 'max';
  mapsTo: string;
  interpretation: Record<string, string>;
  interpretationMapsTo: string;
}

export interface TreeNode {
  id: string;
  type: TreeNodeType;
  phase: string;

  // Question-bearing nodes
  questions?: TreeNodeQuestion[];

  // Hypothesis generation node
  rules?: HypothesisRule[];

  // Assessment recommendation node
  maxGamesPerSession?: number;

  // Care matching node
  careMatchingRules?: Array<{
    ruleId: string;
    pathwayId: string;
    matchCriteria: MatchCriteria;
  }>;

  // Scoring (functional_assessment)
  scoring?: NodeScoring;

  // Navigation
  next?: string;
  on_all_clear?: string;
  next_after_games?: string;

  // Differential assessment extras
  hypothesisModifiers?: Record<string, unknown>;
}

// ─────────────────────────────────────────────
// 7b. DecisionTree — complete decision tree definition
// ─────────────────────────────────────────────
export interface TreeQuestion {
  id: string;
  text: string;
  uiType: 'radio' | 'multi_select' | 'slider' | 'body_map';
  options: QuestionOption[];
  allowMultiple: boolean;
  maxScore: number;
  mapsTo: string;
  sourceInstrument?: string;
  showIf?: string;
  branching?: Record<string, string>;
  redFlagHalt?: Record<string, string>;
  scoreCap?: number;
  sections?: TreeQuestion[];
}

export interface TreeLayer {
  name: string;
  questions: TreeQuestion[];
  maxScore?: number;
  scoringWeight?: number;
}

export interface HypothesisRule {
  id: string;
  displayName: string;
  criteria: MatchCriteria;
  confidence: 'high' | 'medium' | 'low';
  recommendedGames: string[];
  contraindicatedGames: string[];
  crossScanTarget?: string;
}

export interface CareMatchingRule {
  id: string;
  programId: string;
  criteria: MatchCriteria;
  priority: number;
}

export interface DecisionTree {
  id: string;
  version: string;
  moduleType: 'location' | 'condition';
  entryCondition: Record<string, string>;
  architecture: {
    type: string;
    scoringWeights: Record<string, number>;
  };
  crossReferences: {
    tagId: string;
    target: string;
    targetQuestion?: string;
    riskModifier?: number;
  }[];
  /** Legacy layer-based structure (used by v1 TreeWalker fallback) */
  layers: {
    layer0: TreeLayer;
    layer1: TreeLayer;
    layer2: TreeLayer;
    layer3: TreeLayer;
  };
  /** Node-based structure (v3 — takes priority over layers when present) */
  nodes?: TreeNode[];
  /** Maps old option values to new ones for backward compatibility */
  valueNormalization?: Record<string, Record<string, string>>;
  riskTierThresholds: {
    low: [number, number];
    moderate: [number, number];
    high: [number, number];
  };
  hypothesisRules: HypothesisRule[];
  careMatchingRules: CareMatchingRule[];
  disclaimers: {
    standard: string;
    moduleSpecific: string;
  };
  _clinicalNotes?: Record<string, string>;
}

// ─────────────────────────────────────────────
// 8. RedFlagDefinition — master red flag definition
// ─────────────────────────────────────────────
export interface RedFlagDefinition {
  id: string;
  displayName: string;
  clinicalConcern: string;
  /** Urgency tier determines halt behavior and UI treatment */
  urgency: 'immediate' | 'urgent_24h' | 'urgent_48h' | 'specialist_2_4_weeks';
  haltMessage: string;
  haltAction: string;
  sourcePrds: string[];
  requiresCoordination: boolean;
  coordinatedModules: string[];
  /** Criteria that must be met for this flag to trigger */
  criteria: MatchCriteria;
}

// ─────────────────────────────────────────────
// 10. ChatMessage — single message in conversation
// ─────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  cdeOutput?: CDEOutput;
  structuredExtraction?: Partial<FactStore>;
}

// ─────────────────────────────────────────────
// 17. CrossScanTag — tag passed between scan sessions
// ─────────────────────────────────────────────
export interface CrossScanTag {
  tagId: string;
  sourceModule: string;
  sourceSessionId: string;
  data: Record<string, unknown>;
  createdAt: string;
}

// ─────────────────────────────────────────────
// 9. ScanSession — complete scan session record
// ─────────────────────────────────────────────
export interface ScanSession {
  id: string;
  userId?: string;
  sessionType: 'location' | 'condition' | 'wellness';
  decisionTreeId: string;
  treeVersion: string;
  status: 'active' | 'halted' | 'games' | 'completed';
  currentLayer: number;
  factStore: FactStore;
  riskLevel: RiskLevel | null;
  hypotheses: Hypothesis[];
  conditionTags: string[];
  layerScores: Record<string, number>;
  totalScore: number;
  riskTier: RiskTier | null;
  recommendedGames: GameRecommendation[];
  gameResults: Record<string, GameScoreEntry>;
  careRecommendation: CareRecommendationData | null;
  musculageScore?: number;
  conversationHistory: ChatMessage[];
  engineVersion: string;
  startedAt: string;
  completedAt?: string;
  haltedAt?: string;
  haltReason?: string;
}

export interface GameRecommendation {
  gameId: string;
  parameter: string;
  parameterDisplayName?: string;
  purpose: string;
  estimatedDuration: number;
  estimatedDurationSeconds?: number;
  priority?: number;
  contraindicationNote?: string | null;
}

export interface CareRecommendationData {
  pathwayId: string;
  name: string;
  description: string;
  providerTypes: string[];
  durationWeeks: number;
  rationale: string;
  phases?: CarePhase[];
  escalationTriggers?: string[];
  alternatives: { pathwayId: string; name: string; description: string; score?: number }[];
}

// ─────────────────────────────────────────────
// 11. CareProgram — structured care program definition
// ─────────────────────────────────────────────
export interface CareProgram {
  id: string;
  name: string;
  targetConditions: string[];
  targetRiskLevels: RiskTier[];
  durationWeeks: number;
  phases: CarePhase[];
  providerRequirements: string[];
  escalationTriggers: string[];
  escalationPathway?: string;
}

// ─────────────────────────────────────────────
// 12. CarePhase — phase within a care program
// ─────────────────────────────────────────────
export interface CarePhase {
  phase: number;
  name: string;
  weeks: [number, number];
  goals: string[];
  exerciseTypes?: string[];
  reassessmentGames?: string[];
  providerSessions?: { type: string; frequency: string; mode?: string }[] | number;
  progressionCriteria?: Record<string, unknown> | string;
}

// ─────────────────────────────────────────────
// 18. NormativeDataEntry — normative reference data
// ─────────────────────────────────────────────
export interface NormativeDataEntry {
  gameId: string;
  parameterId: string;
  ageBandStart: number;
  ageBandEnd: number;
  sex: 'male' | 'female' | 'all';
  percentiles: {
    p5: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
  };
}

// ─────────────────────────────────────────────
// 19. Score Interpretation Types (Phase 2 Step 2.2)
// ─────────────────────────────────────────────
export type PercentileBand = 'below_10th' | '10th_to_25th' | '25th_to_75th' | 'above_75th';

export interface ScoreTrend {
  direction: 'improved' | 'declined' | 'stable';
  changePercent: number;
  previousDate: string;
  previousPercentile: number;
}

export interface ClinicalRelevanceEntry {
  hypothesisId: string;
  conditionDisplayName: string;
  relationship: 'supports' | 'weakens' | 'neutral';
  explanation: string;
}

export interface ScoreInterpretation {
  gameId: string;
  rawScore: number;
  valid: boolean;
  validationIssue?: string;
  percentile: number;
  percentileBand: PercentileBand;
  musculageContribution: string | null;
  trend: ScoreTrend | null;
  clinicalRelevance: ClinicalRelevanceEntry[];
  patientFacingSummary: string;
  clinicianFacingSummary: string;
}

// ─────────────────────────────────────────────
// 20. Game Specification (Phase 1 Step 1.3)
// ─────────────────────────────────────────────
export interface GameSpec {
  id: string;
  parameter: string;
  parameterDisplayName: string;
  avgDurationSeconds: number;
  intensity: 'low' | 'moderate' | 'high';
  bilateral: boolean;
  minPossibleScore: number;
  maxPossibleScore: number;
  expectedDurationRange: [number, number];
  patientInstructions: string;
}

// ─────────────────────────────────────────────
// 21. Validation Result (Phase 2 Step 2.2)
// ─────────────────────────────────────────────
export interface ValidationResult {
  valid: boolean;
  reason?: string;
  action?: 'retry_with_guidance' | 'retry_with_instruction' | 'flag_and_continue';
  flag?: string;
  clinicalNote?: string;
}

// ─────────────────────────────────────────────
// 22. Care Pathway (Phase 2 Step 2.4)
// ─────────────────────────────────────────────
export interface CarePathway {
  id: string;
  name: string;
  description: string;
  targetConditions: string[];
  targetRiskLevels: RiskLevel[];
  durationWeeks: number;
  providerTypes: string[];
  phases: CarePhase[];
  escalationTriggers: string[];
  escalationPathway: string | null;
}

// ─────────────────────────────────────────────
// Red Flag Engine Result Types
// ─────────────────────────────────────────────
export interface TriggeredFlag {
  flagId: string;
  urgency: 'immediate' | 'urgent_24h' | 'urgent_48h' | 'specialist_2_4_weeks';
  haltMessage: string;
  haltAction: string;
}

export interface RedFlagResult {
  triggered: boolean;
  flags: TriggeredFlag[];
  highestUrgency: 'immediate' | 'urgent_24h' | 'urgent_48h' | 'specialist_2_4_weeks' | 'none';
  insufficientData?: boolean;
  /** True when pain severity >= 8/10 — recommends clinical evaluation (does NOT halt) */
  severityCeiling: boolean;
  severityCeilingMessage: string | null;
}

// ─────────────────────────────────────────────
// LLM Extraction Result
// ─────────────────────────────────────────────
export interface ExtractionResult {
  conversationResponse: string;
  extraction: Partial<FactStore>;
  cdeReady: boolean;
  missingFields: string[];
  error?: boolean;
}

// ─────────────────────────────────────────────
// Tree Walker Types
// ─────────────────────────────────────────────
export interface TreeProgress {
  currentLayer: number;
  totalLayers: number;
  percentComplete: number;
}

// ─────────────────────────────────────────────
// Default FactStore factory
// ─────────────────────────────────────────────
export function createDefaultFactStore(): FactStore {
  return {
    age: null,
    sex: null,
    activityLevel: null,
    userGoals: [],
    bodyRegion: null,
    conditionMentioned: null,
    symptom: null,
    severity: null,
    duration: null,
    onset: null,
    aggravatingFactors: [],
    easingFactors: [],
    radiation: null,
    painPattern: [],
    painQuality: [],
    numbness: null,
    tingling: null,
    weakness: null,
    bowelBladderChange: null,
    balanceAffected: null,
    redFlags: {},
    functionalImpact: {
      sleep: null,
      work: null,
      exercise: null,
      adl: null,
    },
    imaging: {
      hasImaging: null,
      type: null,
      finding: null,
      level: null,
      recencyMonths: null,
    },
    gameScores: {},
    riskLevel: null,
    activeHypotheses: [],
    conditionTags: [],
    crossScanTags: [],
    completedGames: [],
    prePopulatedContext: {},
    priorConditions: null,
    medicalHistory: {
      diabetes: null,
      cancer: null,
      osteoporosis: null,
      rheumatoidArthritis: null,
    },
    morningStiffnessDuration: null,
  };
}
