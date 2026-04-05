CREATE TABLE IF NOT EXISTS "cde_audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"layer" integer,
	"node_id" varchar(100),
	"rule_id" varchar(100),
	"facts_evaluated" jsonb,
	"rule_fired" boolean DEFAULT false NOT NULL,
	"output" jsonb,
	"engine_version" varchar(20) NOT NULL,
	"tree_version" varchar(20) NOT NULL,
	"requires_clinician_review" boolean DEFAULT false NOT NULL,
	"clinician_reviewed" boolean DEFAULT false NOT NULL,
	"clinician_notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cde_body_regions" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"parent_region" varchar(100),
	"sub_regions" jsonb,
	"related_regions" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cde_care_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"program_id" varchar(100) NOT NULL,
	"scan_session_id" uuid,
	"current_phase" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expected_end_at" timestamp with time zone,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"progress" jsonb,
	"reassessment_results" jsonb,
	"escalation_history" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cde_care_programs" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"target_conditions" jsonb,
	"target_risk_levels" jsonb,
	"duration_weeks" integer NOT NULL,
	"phases" jsonb NOT NULL,
	"provider_requirements" jsonb,
	"escalation_triggers" jsonb,
	"escalation_pathway" varchar(100),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cde_conditions" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"icd10_code" varchar(20),
	"body_region_id" varchar(100),
	"module_type" varchar(50) NOT NULL,
	"architecture_type" varchar(50) NOT NULL,
	"red_flag_screen_required" boolean DEFAULT true NOT NULL,
	"typical_parameters_affected" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cde_decision_trees" (
	"id" varchar(100) NOT NULL,
	"version" varchar(20) NOT NULL,
	"module_type" varchar(50) NOT NULL,
	"entry_body_region" varchar(100),
	"entry_condition" varchar(100),
	"architecture" jsonb NOT NULL,
	"tree_json" jsonb NOT NULL,
	"cross_references" jsonb,
	"disclaimers" jsonb,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"reviewed_by" varchar(255),
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cde_decision_trees_id_version_pk" PRIMARY KEY("id","version")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cde_normative_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" varchar(50) NOT NULL,
	"parameter_id" varchar(50) NOT NULL,
	"age_band_start" integer NOT NULL,
	"age_band_end" integer NOT NULL,
	"sex" varchar(10) NOT NULL,
	"percentile_5" double precision NOT NULL,
	"percentile_10" double precision NOT NULL,
	"percentile_25" double precision NOT NULL,
	"percentile_50" double precision NOT NULL,
	"percentile_75" double precision NOT NULL,
	"percentile_90" double precision NOT NULL,
	"percentile_95" double precision NOT NULL,
	"data_source" varchar(255),
	"sample_size" integer,
	"last_updated" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cde_red_flags" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"clinical_concern" text NOT NULL,
	"urgency" varchar(50) NOT NULL,
	"halt_message" text NOT NULL,
	"halt_action" text NOT NULL,
	"source_prds" jsonb,
	"requires_coordination" boolean DEFAULT false NOT NULL,
	"coordinated_modules" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cde_scan_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"session_type" varchar(20) NOT NULL,
	"decision_tree_id" varchar(100) NOT NULL,
	"decision_tree_version" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"current_layer" integer DEFAULT 0 NOT NULL,
	"current_question_id" varchar(100),
	"fact_store" jsonb NOT NULL,
	"risk_level" varchar(10),
	"primary_hypothesis" jsonb,
	"all_hypotheses" jsonb,
	"condition_tags" jsonb,
	"cross_scan_tags" jsonb,
	"layer_scores" jsonb,
	"total_score" double precision,
	"risk_tier" varchar(20),
	"recommended_games" jsonb,
	"game_results" jsonb,
	"care_recommendation" jsonb,
	"musculage_score" double precision,
	"conversation_history" jsonb,
	"pre_populated_from" jsonb,
	"triggered_cross_scans" jsonb,
	"engine_version" varchar(20) NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"halted_at" timestamp with time zone,
	"halt_reason" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cde_audit_log" ADD CONSTRAINT "cde_audit_log_session_id_cde_scan_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."cde_scan_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cde_body_regions" ADD CONSTRAINT "cde_body_regions_parent_region_cde_body_regions_id_fk" FOREIGN KEY ("parent_region") REFERENCES "public"."cde_body_regions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cde_care_enrollments" ADD CONSTRAINT "cde_care_enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cde_care_enrollments" ADD CONSTRAINT "cde_care_enrollments_program_id_cde_care_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."cde_care_programs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cde_care_enrollments" ADD CONSTRAINT "cde_care_enrollments_scan_session_id_cde_scan_sessions_id_fk" FOREIGN KEY ("scan_session_id") REFERENCES "public"."cde_scan_sessions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cde_conditions" ADD CONSTRAINT "cde_conditions_body_region_id_cde_body_regions_id_fk" FOREIGN KEY ("body_region_id") REFERENCES "public"."cde_body_regions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cde_decision_trees" ADD CONSTRAINT "cde_decision_trees_entry_body_region_cde_body_regions_id_fk" FOREIGN KEY ("entry_body_region") REFERENCES "public"."cde_body_regions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cde_decision_trees" ADD CONSTRAINT "cde_decision_trees_entry_condition_cde_conditions_id_fk" FOREIGN KEY ("entry_condition") REFERENCES "public"."cde_conditions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cde_scan_sessions" ADD CONSTRAINT "cde_scan_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cde_audit_log_session_id_idx" ON "cde_audit_log" ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cde_audit_log_event_type_idx" ON "cde_audit_log" ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cde_audit_log_review_idx" ON "cde_audit_log" ("requires_clinician_review");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cde_decision_trees_status_idx" ON "cde_decision_trees" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cde_decision_trees_active_idx" ON "cde_decision_trees" ("id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cde_normative_data_unique_idx" ON "cde_normative_data" ("game_id","age_band_start","age_band_end","sex");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cde_scan_sessions_user_id_idx" ON "cde_scan_sessions" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cde_scan_sessions_status_idx" ON "cde_scan_sessions" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cde_scan_sessions_tree_id_idx" ON "cde_scan_sessions" ("decision_tree_id");