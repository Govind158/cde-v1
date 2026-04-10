# Current Gaps — Implementation Status Tracker

> **Rule:** Update this file after every implementation session. This is the authoritative record of what's done and what's pending.

## Implementation Status

### Decision Trees (JSON files)

| Tree | File | Nodes | Rules | Paths | Status |
|------|------|-------|-------|-------|--------|
| Low Back Pain | `low-back-pain.json` | 9 | 7 | 4 (localized, buttock, radicular, halt) | ✅ Implemented + tested |
| Neck Pain | `neck-pain.json` | 9 | 12 | 3 (arm radicular, headache, straight) | ❌ JSON not created |
| Shoulder Pain | `shoulder-pain.json` | 8 | 10 | 2 (cervicogenic, straight) | ❌ JSON not created |
| Knee Pain | `knee-pain.json` | 8 | 14 | 2 (internal derangement, straight) | ❌ JSON not created |
| Hip Pain | `hip-pain.json` | 8 | 10 | 2 (lumbar referral, straight) | ❌ JSON not created |
| Ankle Pain | `ankle-pain.json` | 8 | 10 | 2 (instability, straight) | ❌ JSON not created |
| Elbow Pain | `elbow-pain.json` | 8 | 12 | 2 (nerve, straight) | ❌ JSON not created |
| Wrist Pain | `wrist-pain.json` | 8 | 12 | 2 (nerve, straight) | ❌ JSON not created |

### Engine Modules

| Module | File | Status | Notes |
|--------|------|--------|-------|
| CDEEngine | `engine/index.ts` | ✅ | Session lifecycle, walkerCache, completeSession with parameterScores |
| TreeWalker | `engine/tree-walker.ts` | ✅ | 8-type dispatch, branching (no default), scoring |
| FactStore | `engine/fact-store.ts` | ✅ | JSONB-backed, turn counting |
| Risk Stratifier | `engine/risk-stratifier.ts` | ✅ | 6-factor additive, 5 tiers, back-specific modifiers |
| Rule Evaluator | `engine/rule-evaluator.ts` | ✅ | ALL/ANY/NONE with equals/in/contains/containsAny/lessThan/greaterThan/between |
| Audit Logger | `engine/audit-logger.ts` | ✅ | Append-only, batch flush |
| Score Interpreter | `interpreter/score-interpreter.ts` | ⚠️ Partial | Percentile = rawScore/maxScore×100 (placeholder). Needs normative data lookup |
| Game Recommender | `interpreter/game-recommender.ts` | ⚠️ Partial | Collects from hypotheses, basic contraindication filter. Missing: priority scoring, difficulty filter, completion check |
| Care Matcher | `interpreter/care-matcher.ts` | ✅ | Multi-factor scoring. Only has LBP pathways (cp_lbp_self_manage, cp_lbp_guided, cp_lbp_intensive). Needs all-region pathways |
| Contraindications | `safety/contraindications.ts` | ❌ Empty | No game-level or risk-tier contraindication enforcement |
| Guardrails | `safety/guardrails.ts` | ❌ Empty | No severity ceiling ≥8, no output safety filters |
| Ontology | `ontology/*.ts` | ❌ Empty | Body regions, conditions, parameters defined but never queried at runtime |

### LLM Layer

| Module | File | Status | Notes |
|--------|------|--------|-------|
| Chat Orchestrator | `llm/chat-orchestrator.ts` | ✅ | treeActive blocking, numeric answer routing |
| Extraction Prompt | `llm/extraction-prompt.ts` | ✅ | ---EXTRACTION--- format, field collection, NEVER summarize |
| Extraction Parser | `llm/extraction-parser.ts` | ✅ | 6-strategy robust parser |
| Formatting Prompt | `llm/formatting-prompt.ts` | ✅ | Rephrases CDE output |
| LLM Client | `llm/llm-client.ts` | ✅ | OpenAI gpt-4o-mini wrapper |
| API Sanitization | In route handler | ✅ | sanitizeResponseForClient strips leaked JSON |

### Client / UI

| Component | Status | Notes |
|-----------|--------|-------|
| ChatContainer | ✅ | Renders conversation + options |
| OptionSelector | ✅ | Renders buttons (question text removed — shows only once in bubble) |
| Game Recommendations | ✅ | Shows recommended games + Skip button |
| Results Page | ✅ | Risk badge, musculage, BAL/ROM/MOB/REF, care program |
| Scan Store | ✅ | Zustand with status machine, game handling |

### Database

| Table | Status | Notes |
|-------|--------|-------|
| cdeScanSessions | ✅ | factStore JSONB, treeActive flag |
| cdeDecisionTrees | ✅ | Composite PK, 5-min TTL cache. Only LBP tree seeded |
| cdeAuditLog | ✅ | Append-only |
| cdeNormativeData | ❌ Empty | Table exists, no data. Percentile calculation is a placeholder |
| cdeCarePrograms | ❌ Empty | Table exists, pathways hardcoded in care-matcher.ts |
| cdeCareEnrollments | ❌ Empty | Table exists, not used at runtime |

## Pending Fixes

| Issue | Fix File | Priority |
|-------|----------|----------|
| LLM re-asks during tree phase (severity "5" blocked) | `cde-fix-numeric-blocking.md` | HIGH |
| Buttock branch not implemented | `cde-fix-FINAL-3-merged.md` | HIGH |
| ROM shows "--" despite FA1 game played | `cde-fix-FINAL-3-merged.md` | MEDIUM |
| Risk modifiers per region not implemented | — (need to code) | MEDIUM |
| Contraindications module empty | — | MEDIUM |
| Normative data tables empty | — | LOW (placeholder works for MVP) |

## Build Priority Order

1. **Apply pending fixes** (numeric blocking, buttock branch, ROM) — ~45 min
2. **Create neck-pain.json** — highest clinical demand after back — ~2 hrs
3. **Create shoulder-pain.json** — ~2 hrs
4. **Create knee-pain.json** — ~2 hrs
5. **Implement contraindications module** — critical for safety — ~1 hr
6. **Implement guardrails (severity ceiling)** — ~30 min
7. **Add region-specific risk modifiers** — ~1 hr
8. **Create remaining trees** (hip, ankle, elbow, wrist) — ~6 hrs
9. **Populate normative data** — requires clinical data collection — timeline TBD
10. **Seed care pathways to DB** — ~1 hr
