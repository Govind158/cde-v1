/**
 * Kriya Database Schema — Drizzle ORM
 * CDE tables are prefixed with cde_ to avoid conflicts with existing tables.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  bigserial,
  serial,
  timestamp,
  jsonb,
  doublePrecision,
  primaryKey,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─────────────────────────────────────────────
// Existing tables (referenced by CDE tables)
// ─────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─────────────────────────────────────────────
// 1. CDE Body Regions
// ─────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const cdeBodyRegions: any = pgTable('cde_body_regions', {
  id: varchar('id', { length: 100 }).primaryKey(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  parentRegion: varchar('parent_region', { length: 100 }).references(
    (): AnyPgColumn => cdeBodyRegions.id
  ),
  subRegions: jsonb('sub_regions').$type<string[]>(),
  relatedRegions: jsonb('related_regions').$type<string[]>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─────────────────────────────────────────────
// 2. CDE Conditions
// ─────────────────────────────────────────────
export const cdeConditions = pgTable('cde_conditions', {
  id: varchar('id', { length: 100 }).primaryKey(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  icd10Code: varchar('icd10_code', { length: 20 }),
  bodyRegionId: varchar('body_region_id', { length: 100 }).references(
    () => cdeBodyRegions.id
  ),
  moduleType: varchar('module_type', { length: 50 }).notNull(),
  architectureType: varchar('architecture_type', { length: 50 }).notNull(),
  redFlagScreenRequired: boolean('red_flag_screen_required').default(true).notNull(),
  typicalParametersAffected: jsonb('typical_parameters_affected').$type<string[]>(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─────────────────────────────────────────────
// 3. CDE Red Flags
// ─────────────────────────────────────────────
export const cdeRedFlags = pgTable('cde_red_flags', {
  id: varchar('id', { length: 100 }).primaryKey(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  clinicalConcern: text('clinical_concern').notNull(),
  urgency: varchar('urgency', { length: 50 }).notNull(),
  haltMessage: text('halt_message').notNull(),
  haltAction: text('halt_action').notNull(),
  sourcePrds: jsonb('source_prds').$type<string[]>(),
  requiresCoordination: boolean('requires_coordination').default(false).notNull(),
  coordinatedModules: jsonb('coordinated_modules').$type<string[]>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─────────────────────────────────────────────
// 4. CDE Decision Trees (composite PK: id + version)
// ─────────────────────────────────────────────
export const cdeDecisionTrees = pgTable(
  'cde_decision_trees',
  {
    id: varchar('id', { length: 100 }).notNull(),
    version: varchar('version', { length: 20 }).notNull(),
    moduleType: varchar('module_type', { length: 50 }).notNull(),
    entryBodyRegion: varchar('entry_body_region', { length: 100 }).references(
      () => cdeBodyRegions.id
    ),
    entryCondition: varchar('entry_condition', { length: 100 }).references(
      () => cdeConditions.id
    ),
    architecture: jsonb('architecture').$type<Record<string, unknown>>().notNull(),
    treeJson: jsonb('tree_json').$type<Record<string, unknown>>().notNull(),
    crossReferences: jsonb('cross_references').$type<Record<string, unknown>[]>(),
    disclaimers: jsonb('disclaimers').$type<Record<string, string>>(),
    status: varchar('status', { length: 20 }).default('draft').notNull(),
    reviewedBy: varchar('reviewed_by', { length: 255 }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.version] }),
    statusIdx: index('cde_decision_trees_status_idx').on(table.status),
    activeIdx: index('cde_decision_trees_active_idx')
      .on(table.id)
      .where(sql`${table.status} = 'active'`),
  })
);

// ─────────────────────────────────────────────
// 5. CDE Normative Data
// ─────────────────────────────────────────────
export const cdeNormativeData = pgTable(
  'cde_normative_data',
  {
    id: serial('id').primaryKey(),
    gameId: varchar('game_id', { length: 50 }).notNull(),
    parameterId: varchar('parameter_id', { length: 50 }).notNull(),
    ageBandStart: integer('age_band_start').notNull(),
    ageBandEnd: integer('age_band_end').notNull(),
    sex: varchar('sex', { length: 10 }).notNull(),
    percentile5: doublePrecision('percentile_5').notNull(),
    percentile10: doublePrecision('percentile_10').notNull(),
    percentile25: doublePrecision('percentile_25').notNull(),
    percentile50: doublePrecision('percentile_50').notNull(),
    percentile75: doublePrecision('percentile_75').notNull(),
    percentile90: doublePrecision('percentile_90').notNull(),
    percentile95: doublePrecision('percentile_95').notNull(),
    dataSource: varchar('data_source', { length: 255 }),
    sampleSize: integer('sample_size'),
    lastUpdated: timestamp('last_updated', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueIdx: uniqueIndex('cde_normative_data_unique_idx').on(
      table.gameId,
      table.ageBandStart,
      table.ageBandEnd,
      table.sex
    ),
  })
);

// ─────────────────────────────────────────────
// 6. CDE Scan Sessions
// ─────────────────────────────────────────────
export const cdeScanSessions = pgTable(
  'cde_scan_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    sessionType: varchar('session_type', { length: 20 }).notNull(),
    decisionTreeId: varchar('decision_tree_id', { length: 100 }).notNull(),
    decisionTreeVersion: varchar('decision_tree_version', { length: 20 }).notNull(),
    status: varchar('status', { length: 20 }).default('active').notNull(),
    currentLayer: integer('current_layer').default(0).notNull(),
    currentQuestionId: varchar('current_question_id', { length: 100 }),
    factStore: jsonb('fact_store').$type<Record<string, unknown>>().notNull(),
    riskLevel: varchar('risk_level', { length: 10 }),
    primaryHypothesis: jsonb('primary_hypothesis').$type<Record<string, unknown>>(),
    allHypotheses: jsonb('all_hypotheses').$type<Record<string, unknown>[]>(),
    conditionTags: jsonb('condition_tags').$type<string[]>(),
    crossScanTags: jsonb('cross_scan_tags').$type<Record<string, unknown>[]>(),
    layerScores: jsonb('layer_scores').$type<Record<string, number>>(),
    totalScore: doublePrecision('total_score'),
    riskTier: varchar('risk_tier', { length: 20 }),
    recommendedGames: jsonb('recommended_games').$type<Record<string, unknown>[]>(),
    gameResults: jsonb('game_results').$type<Record<string, unknown>>(),
    careRecommendation: jsonb('care_recommendation').$type<Record<string, unknown>>(),
    musculageScore: doublePrecision('musculage_score'),
    conversationHistory: jsonb('conversation_history').$type<Record<string, unknown>[]>(),
    prePopulatedFrom: jsonb('pre_populated_from').$type<Record<string, unknown>>(),
    triggeredCrossScans: jsonb('triggered_cross_scans').$type<Record<string, unknown>[]>(),
    engineVersion: varchar('engine_version', { length: 20 }).notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    haltedAt: timestamp('halted_at', { withTimezone: true }),
    haltReason: text('halt_reason'),
  },
  (table) => ({
    userIdIdx: index('cde_scan_sessions_user_id_idx').on(table.userId),
    statusIdx: index('cde_scan_sessions_status_idx').on(table.status),
    treeIdIdx: index('cde_scan_sessions_tree_id_idx').on(table.decisionTreeId),
  })
);

// ─────────────────────────────────────────────
// 7. CDE Audit Log (APPEND-ONLY)
// ─────────────────────────────────────────────
export const cdeAuditLog = pgTable(
  'cde_audit_log',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    sessionId: uuid('session_id')
      .references(() => cdeScanSessions.id, { onDelete: 'cascade' })
      .notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
    eventType: varchar('event_type', { length: 50 }).notNull(),
    layer: integer('layer'),
    nodeId: varchar('node_id', { length: 100 }),
    ruleId: varchar('rule_id', { length: 100 }),
    factsEvaluated: jsonb('facts_evaluated').$type<Record<string, unknown>>(),
    ruleFired: boolean('rule_fired').default(false).notNull(),
    output: jsonb('output').$type<Record<string, unknown>>(),
    engineVersion: varchar('engine_version', { length: 20 }).notNull(),
    treeVersion: varchar('tree_version', { length: 20 }).notNull(),
    requiresClinicianReview: boolean('requires_clinician_review').default(false).notNull(),
    clinicianReviewed: boolean('clinician_reviewed').default(false).notNull(),
    clinicianNotes: text('clinician_notes'),
  },
  (table) => ({
    sessionIdIdx: index('cde_audit_log_session_id_idx').on(table.sessionId),
    eventTypeIdx: index('cde_audit_log_event_type_idx').on(table.eventType),
    reviewIdx: index('cde_audit_log_review_idx')
      .on(table.requiresClinicianReview)
      .where(sql`${table.clinicianReviewed} = false`),
  })
);

// ─────────────────────────────────────────────
// 8. CDE Care Programs
// ─────────────────────────────────────────────
export const cdeCarePrograms = pgTable('cde_care_programs', {
  id: varchar('id', { length: 100 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  targetConditions: jsonb('target_conditions').$type<string[]>(),
  targetRiskLevels: jsonb('target_risk_levels').$type<string[]>(),
  durationWeeks: integer('duration_weeks').notNull(),
  phases: jsonb('phases').$type<Record<string, unknown>[]>().notNull(),
  providerRequirements: jsonb('provider_requirements').$type<string[]>(),
  escalationTriggers: jsonb('escalation_triggers').$type<string[]>(),
  escalationPathway: varchar('escalation_pathway', { length: 100 }),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─────────────────────────────────────────────
// 9. CDE Care Enrollments
// ─────────────────────────────────────────────
export const cdeCareEnrollments = pgTable('cde_care_enrollments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  programId: varchar('program_id', { length: 100 })
    .references(() => cdeCarePrograms.id)
    .notNull(),
  scanSessionId: uuid('scan_session_id').references(() => cdeScanSessions.id),
  currentPhase: integer('current_phase').default(1).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  expectedEndAt: timestamp('expected_end_at', { withTimezone: true }),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  progress: jsonb('progress').$type<Record<string, unknown>>(),
  reassessmentResults: jsonb('reassessment_results').$type<Record<string, unknown>>(),
  escalationHistory: jsonb('escalation_history').$type<Record<string, unknown>[]>(),
});
