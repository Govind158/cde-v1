# Kriya Clinical Decision Engine — System Documentation

> **Purpose:** This document describes how the application *currently works* based on static analysis of the codebase. It does not describe intended future behaviour or design aspirations. Every claim made here is traceable to a specific file and function.

---

## 1. Overview

The **Kriya Clinical Decision Engine (CDE)** is a Next.js 14 full-stack web application that guides users through a musculoskeletal (MSK) health self-assessment. It combines a structured clinical decision tree with an AI language model conversation layer. The system collects symptoms via chat, evaluates them against predefined clinical rules, detects safety red flags, and produces a risk score with a care recommendation.

There are three stated entry types: pain/discomfort by body location, known condition, and general movement health (wellness). All three routes share the same backend pipeline.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (Next.js Client)                                        │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │  Scan Entry Page │  │  ChatContainer   │  │  Results Page │  │
│  │  /app/scan       │  │  /app/scan/[id]  │  │  /results/[id]│  │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬───────┘  │
│           │                     │                     │          │
│           └──────── Zustand store (scan-store.ts) ───-┘          │
└───────────────────────────────────────────────────────────────────┘
                                 │ HTTP
┌────────────────────────────────▼──────────────────────────────────┐
│  Next.js API Routes  (src/app/api/cde/)                           │
│  POST /scan/start  │  POST /scan/message  │  POST /scan/answer    │
│  POST /scan/complete │ POST /scan/game-result │ GET /scan/[id]    │
└───────────┬──────────────────────────────────────────────────────-┘
            │
┌───────────▼───────────────────────────────────────────────────────┐
│  Server Layer  (src/server/cde/)                                  │
│                                                                   │
│  ┌─────────────────────┐   ┌────────────────────────────────┐    │
│  │  ChatOrchestrator   │   │       CDEEngine                │    │
│  │  (llm/)             │──▶│  (engine/index.ts)             │    │
│  └──────────┬──────────┘   └──────────────┬─────────────────┘    │
│             │                             │                       │
│  ┌──────────▼──────────┐   ┌──────────────▼─────────────────┐    │
│  │  OpenAI API         │   │  TreeWalker + FactStoreManager  │    │
│  │  (gpt-4o-mini)      │   │  (engine/tree-walker.ts)        │    │
│  └─────────────────────┘   └──────────────┬─────────────────┘    │
│                                           │                       │
│                            ┌──────────────▼─────────────────┐    │
│                            │  RedFlagEngine + Registry       │    │
│                            │  (safety/)                      │    │
│                            └─────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────--┘
                                 │
┌────────────────────────────────▼──────────────────────────────────┐
│  PostgreSQL (Supabase)                                            │
│  cdeScanSessions │ cdeDecisionTrees │ cdeAuditLog │ others        │
└───────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Location | Role |
|-----------|----------|------|
| **Scan Entry Page** | `src/app/app/scan/page.tsx` | Entry point: user picks scan type |
| **ChatContainer** | `src/components/cde/chat/ChatContainer.tsx` | Renders conversation + structured question inputs |
| **Results Page** | `src/app/app/scan/results/[sessionId]/page.tsx` | Fetches and displays session results |
| **Zustand Store** | `src/stores/scan-store.ts` | Client-side session state and API call orchestration |
| **API Routes** | `src/app/api/cde/scan/` | REST endpoints, validate input, delegate to engine |
| **CDEEngine** | `src/server/cde/engine/index.ts` | Server-side orchestrator; manages session lifecycle |
| **ChatOrchestrator** | `src/server/cde/llm/chat-orchestrator.ts` | Bridges LLM extraction with CDE engine |
| **TreeWalker** | `src/server/cde/engine/tree-walker.ts` | Stateful traversal of a decision tree |
| **FactStoreManager** | `src/server/cde/engine/fact-store.ts` | Session working memory (JSONB-backed) |
| **RedFlagEngine** | `src/server/cde/safety/red-flag-engine.ts` | Evaluates 19 clinical safety red flags |
| **AuditLogger** | `src/server/cde/engine/audit-logger.ts` | Append-only clinical audit trail |
| **LLM Client** | `src/server/cde/llm/llm-client.ts` | Raw fetch wrapper around OpenAI API |

---

## 3. Actual Workflow (Step-by-Step)

### 3.1 Session Start

```
User selects scan type (pain location / condition / wellness)
  ↓
scan-store.ts: startScan(entryType, bodyRegion?, condition?)
  ↓
POST /api/cde/scan/start
  ↓
CDEEngine.startSession()
  ├─ Build treeId from bodyRegion or condition
  │    e.g. "lower_back" → "DT_LOWER_BACK"
  │    (Only DT_LOW_BACK_PAIN and DT_LUMBAR_SPINE have JSON files)
  ├─ Try DB for active tree → fallback to require('../trees/{name}.json')
  │    → fallback to CDEEngine.createMinimalTree() (empty layers)
  ├─ Initialise FactStoreManager with bodyRegion/condition
  ├─ Create TreeWalker instance
  ├─ Insert row into cdeScanSessions (or generate UUID if DB unavailable)
  ├─ Cache TreeWalker in walkerCache (in-memory Map, no TTL)
  └─ Return { sessionId, firstOutput: walker.evaluateCurrentNode() }
  ↓
store receives firstOutput; adds welcome message to messages[]
store navigates to /app/scan/{sessionId}
```

**Note:** If no matching JSON tree file exists (e.g. `wellness`, `sciatica`), a minimal tree with empty question arrays is used. `evaluateCurrentNode()` immediately calls `completeAssessment()` and returns the `__complete` sentinel.

---

### 3.2 Free-Text Chat Message

```
User types a message in ChatInput
  ↓
scan-store.ts: sendMessage(message)
  ↓
POST /api/cde/scan/message { sessionId, message }
  ↓
ChatOrchestrator.processMessage(sessionId, message)
  │
  ├─ 1. Load session from DB (cdeScanSessions)
  ├─ 2. Reconstruct FactStoreManager from session.factStore (JSONB)
  ├─ 3. Append user message to conversationHistory (trimmed to last 20)
  │
  ├─ 4. Build extraction prompt:
  │       buildExtractionPrompt(factStore.toJSON())
  │       Appends "ALREADY COLLECTED" section listing known fields
  │
  ├─ 5. Call OpenAI gpt-4o-mini (callClaude alias → callLLM)
  │       System: extraction prompt (with known facts appended)
  │       Messages: last 20 conversation turns
  │       Response format: plain text + "---EXTRACTION---" + JSON
  │
  ├─ 6. parseExtraction(llmResponse)
  │       Splits on "---EXTRACTION---"
  │       Extracts JSON with greedy regex \{[\s\S]*\}
  │       Validates fields against VALID_FACT_STORE_FIELDS whitelist
  │       Returns { conversationResponse, extraction, cdeReady, missingFields }
  │
  ├─ 7. factStore.update(extraction)
  │       Deep-merges extracted fields into FactStore
  │
  ├─ 8. Red flag check: evaluateRedFlags(factStore.getStore())
  │       If triggered → returns CDERedFlagHaltOutput immediately
  │       Updates session status to 'halted'
  │
  ├─ 9. If cdeReady AND no red flags:
  │       CDEEngine.processStructuredInput(sessionId, extraction)
  │         ├─ factStore.update(extraction) again
  │         ├─ evaluateRedFlags() again
  │         ├─ Check factStore.isCDEReady()
  │         │    Returns false if missing: bodyRegion, severity,
  │         │    ≥1 red flag screened, ≥1 aggravating factor
  │         └─ TreeWalker.evaluateCurrentNode() → next question
  │
  │       If result is sentinel (id starts with "__"):
  │         CDEEngine.completeSession(sessionId)
  │         Return CDECareRecommendationOutput (hardcoded pathway)
  │
  ├─ 10. If cdeOutput type is not 'red_flag_halt' and not 'question':
  │        Call OpenAI again to format the output into user-friendly text
  │
  ├─ 11. Append assistant message to conversationHistory
  ├─ 12. Save session to DB (factStore + conversationHistory)
  └─ Return { conversationResponse, cdeOutput, sessionState }
  ↓
scan-store.ts receives response:
  - type 'question' + id starts with '__' → status = 'results'
  - type 'question' with real options      → activeQuestion set (shows OptionSelector)
  - type 'care_recommendation'             → status = 'results'
  - type 'red_flag_halt'                  → status = 'halted'
  ↓
ChatContainer useEffect detects status === 'results'
  → router.push('/app/scan/results/{sessionId}')
```

---

### 3.3 Structured Answer (Button Click)

```
User selects an option in OptionSelector or submits SeveritySlider
  ↓
scan-store.ts: submitAnswer(questionId, answer)
  ↓
POST /api/cde/scan/answer { sessionId, questionId, answer }
  ↓
CDEEngine.processAnswer(sessionId, questionId, answer)
  ├─ Load session (from walkerCache or DB)
  ├─ TreeWalker.processAnswer(questionId, answer)
  │    ├─ Find question in tree
  │    ├─ Calculate score from matched option.score
  │    ├─ Apply score cap if defined
  │    ├─ Update layerState.score and layerState.maxScore
  │    ├─ factStore.set(question.mapsTo, mappedValue)
  │    ├─ If Layer 0: check question.redFlagHalt for halt triggers
  │    │               run evaluateRedFlags() as secondary check
  │    ├─ Handle branching: push to pendingConditionalQuestions
  │    ├─ Advance currentQuestionIndex or shift pendingConditional
  │    └─ Return evaluateCurrentNode() (next question or completion)
  ├─ Save session state to DB
  ├─ If walker.isHalted() → updateSessionStatus('halted')
  ├─ If walker.isComplete() → updateSessionStatus('games')
  └─ Return { cdeOutput, sessionState }
  ↓
scan-store.ts receives response:
  - type 'question' normal     → activeQuestion set
  - type 'question' sentinel   → status = 'results'
  - type 'game_recommendation' → status = 'games', recommendedGames set
  - type 'red_flag_halt'       → status = 'halted'
```

---

### 3.4 Session Completion and Results

```
ChatContainer detects status === 'results'
  ↓
router.push('/app/scan/results/{sessionId}')
  ↓
Results Page: useEffect → GET /api/cde/scan/{sessionId}
  ↓
CDEEngine.getSession(sessionId)
  If careRecommendation is null → CDEEngine.completeSession()
  Build response:
    summary: { totalScore, riskTier, hypotheses, layerScores, conditionTags }
    careRecommendation: hardcoded "Guided Recovery Program"
    musculageScore: avg of game result percentiles (0 if no games)
    crossScanRecommendations: []
    gameResults: session.gameResults ?? {}
  ↓
Results Page renders:
  RiskTierBadge + MusculageSummary + ScoreCard(s) + CarePathwayCard + CrossScanCard
```

---

## 4. CDE Engine

**File:** `src/server/cde/engine/index.ts`

The CDEEngine is a static class (all methods are `static`) that serves as the server-side entry point for all scan operations. It does not maintain its own state — state lives in the `walkerCache` Map and PostgreSQL.

### Session Loading Strategy

When any operation needs to process a session, it calls the private `loadSession(sessionId)`:

1. Check `walkerCache` (in-memory Map, keyed by sessionId, **no TTL, no eviction**)
2. If not cached: query `cdeScanSessions` from DB, reconstruct `FactStoreManager` and `TreeWalker`
3. If DB fails: create an empty `FactStoreManager` and a minimal tree walker

### Percentile Calculation

`calculatePercentile(gameId, rawScore, facts)` is implemented as:
```ts
return Math.min(99, Math.max(1, Math.round(rawScore)));
```
This treats `rawScore` as a percentile directly. The `cdeNormativeData` table in the database is **never queried**.

### Care Recommendation

`completeSession()` always returns the same hardcoded care recommendation regardless of condition, risk tier, or hypothesis:

```ts
{
  pathwayId: 'cp_guided_general',
  name: 'Guided Recovery Program',
  description: 'A structured program to address your assessment results',
  providerTypes: ['Physiotherapist'],
  durationWeeks: 8,
  rationale: 'Based on your risk profile and assessment scores'
}
```

The `careMatchingRules` array defined in `low-back-pain.json` is never evaluated.

### FactStore Critical Field Check

Before the CDE engine will attempt to advance the tree via `processStructuredInput`, `factStore.isCDEReady()` must return `true`. This requires all four of:
- `bodyRegion !== null` OR `conditionMentioned !== null`
- `severity !== null`
- At least one field in `redFlags` is not `null`
- `aggravatingFactors.length > 0`

If any are missing, the engine returns a `__cde_not_ready` sentinel question.

---

## 5. Decision Tree System

### Tree Loading

**File:** `src/server/cde/trees/tree-loader.ts`

Trees are loaded in the following order:
1. In-memory cache (5-minute TTL, keyed by tree ID only, not version)
2. Database query: `cdeDecisionTrees` where `id = treeId AND status = 'active'`
3. JSON file via `require('../trees/{fileName}.json')` — hard-coded file map:
   ```ts
   { DT_LOW_BACK_PAIN: 'low-back-pain', DT_LUMBAR_SPINE: 'low-back-pain' }
   ```
4. If all fail: `CDEEngine.createMinimalTree()` — empty layers, no questions

**Note:** `tree-loader.ts`'s `loadTree()` and `validateTree()` functions are **not called by CDEEngine**. CDEEngine has its own loading logic directly in `startSession()` using `require()` with a different filename derivation (`bodyRegion.replace(/\s+/g, '-')` → e.g. "lower_back" → "lower_back.json" which does not exist).

### Tree ID Derivation

In `CDEEngine.startSession()`:
```ts
const treeId = params.condition
  ? `DT_${params.condition.toUpperCase().replace(/\s+/g, '_')}`
  : params.bodyRegion
    ? `DT_${params.bodyRegion.toUpperCase().replace(/\s+/g, '_')}`
    : 'DT_WELLNESS';
```

Only `DT_LOW_BACK_PAIN` maps to an existing tree file via `tree-loader.ts`. All other IDs fall through to the minimal fallback tree.

### Tree Structure — `low-back-pain.json`

The only fully implemented tree. Structure:

| Layer | Name | Questions | Purpose |
|-------|------|-----------|---------|
| 0 | Red Flag Screen | Q0.1, Q0.2 | Cauda equina, systemic flags |
| 1 | Symptom Profile | Q1.1, Q1.2, Q1.3 | Duration, pain character, aggravating factors |
| 2 | Functional Impact | Q2.1, Q2.2 | ADL impact, sleep/work impact |
| 3 | Risk Modifiers | Q3.1, Q3.2 | Activity level, prior episodes |

**Scoring weights:** Layer 0 = 0 (no score), Layer 1 = 0.30, Layer 2 = 0.30, Layer 3 = 0.40

**Risk thresholds:** Low [0–4], Moderate [5–8], High [9+]

**Branching:** Q1.2 option `radiating_leg` branches to Q1.2a (below-knee check). Implemented via `pendingConditionalQuestions` queue in TreeWalker.

**Conditional display:** Q3.2 (prior episodes) has `showIf: "duration in ['6w_3m', 'gt_3m']"` — only shown for subacute/chronic cases.

**Hypotheses:** 5 rules evaluated after all layers complete:
- `hyp_postural_lbp` — dull ache + sitting or standing aggravation
- `hyp_flexion_intolerant` — flexion_lifting as aggravating factor
- `hyp_extension_intolerant` — extension as aggravating factor
- `hyp_radicular` — radiating_leg or below_knee radiation
- `hyp_deconditioning` — sedentary + functional impact

Each hypothesis carries `recommendedGames[]` and `contraindicatedGames[]`.

### Already-Answered Question Skipping

`TreeWalker.getCurrentQuestion()` (since recent update) checks `isAlreadyPopulated(question.mapsTo)` for all Layer 1–3 questions. If the FactStore already holds a non-null/non-empty value at that path, the question is auto-skipped and `autoScoreSkippedQuestion()` attempts to match the stored value against option values for scoring. Layer 0 is **always** asked regardless.

---

## 6. LLM Integration

### Provider

Despite the alias `callClaude`, the system calls **OpenAI's API**:
- **Endpoint:** `https://api.openai.com/v1/responses`
- **Model:** `gpt-4o-mini`
- **Auth:** `process.env.OPENAI_API_KEY`
- **Timeout:** 30 seconds
- **Retries:** Up to 3, exponential backoff, only on 429 or 5xx

### Where the LLM Is Called

The LLM is called in exactly two places, both inside `ChatOrchestrator.processMessage()`:

#### Call 1 — Extraction (every message)

**System prompt:** `buildExtractionPrompt(factStore.toJSON())`
Includes the base extraction instructions plus an appended section listing fields already collected from the FactStore (prevents re-asking).

**User messages:** Last 20 turns of conversation history.

**Expected response format:**
```
[natural language reply to user]

---EXTRACTION---
{
  "bodyRegion": "lumbar_spine",
  "severity": 4,
  "cdeReady": false,
  "missingFields": ["duration", "aggravatingFactors"]
}
```

**Output used for:**
- `conversationResponse` — shown to the user in the chat UI
- `extraction` — merged into FactStore
- `cdeReady` — determines if CDE engine is invoked

#### Call 2 — Formatting (conditional)

Only triggered when `cdeOutput` exists AND type is not `'red_flag_halt'` AND not `'question'`.

In practice this means it fires when `processStructuredInput` returns a `game_recommendation`, `score_interpretation`, `care_recommendation`, or `cross_scan` output.

**System prompt:** `FORMATTING_SYSTEM_PROMPT` (static — no dynamic context)

**User message:** `"Format this CDE output for the user:\n{JSON.stringify(cdeOutput)}"`

**Output used for:** Replaces `conversationResponse` with a human-friendly version.

### Is the LLM Controlling Flow?

**No.** The LLM does not decide which question to ask next, what risk level to assign, or what care to recommend. Its role is:

1. **Extraction** — Parse natural language into structured FactStore fields
2. **Formatting** — Convert structured CDE output into conversational prose

All routing and clinical logic decisions are made by the CDE engine and TreeWalker based on the decision tree JSON and the FactStore state.

---

## 7. Flow Handling by Scan Type

The scan entry page (`src/app/app/scan/page.tsx`) presents three buttons. Their actual behaviour in code:

| Entry Type | Entry Point | Tree Derivation | Resulting Tree |
|------------|-------------|-----------------|----------------|
| **Pain / Discomfort** | User selects body region from BodyMapSelector | `DT_{BODYREGION.UPPER}` | `DT_LUMBAR_SPINE` or `DT_LOWER_BACK` → `low-back-pain.json` (only if region matches) |
| **Known Condition** | User selects from condition list | `DT_{CONDITION.UPPER}` e.g. `DT_SCIATICA` | Fallback minimal tree (no sciatica.json exists) |
| **Movement Health** | Immediate call to startScan('wellness') | `DT_WELLNESS` | Fallback minimal tree (no wellness.json exists) |

**All three entry types share the same code path.** There is no conditional branching in the pipeline based on entry type. The only difference is which tree is loaded (or which fallback is used).

**Practical result:** Only a lower-back pain scan via the body map — where the user selects a region that resolves to `DT_LOW_BACK_PAIN` or `DT_LUMBAR_SPINE` — uses the structured decision tree with questions. All other scans fall through to the minimal empty tree and go directly to the LLM-only conversational path.

---

## 8. Summary Generation

Summary generation happens in two places depending on the path taken.

### Path A — Tree-Based (structured questions answered)

When `TreeWalker.completeAssessment()` is called after all questions are answered:

1. Weighted layer scores calculated: `(layerState.score / layerState.maxScore) * layerWeight`
2. Total score summed from all layers
3. Risk tier assigned:
   - Score ≥ 9 → `HIGH`
   - Score ≥ 5 → `MODERATE`
   - Score < 5 → `LOW`
4. Hypothesis rules evaluated via `rule-evaluator.ts` (ALL/ANY/NONE logic against FactStore)
5. Games recommended based on matched hypothesis `recommendedGames[]`

The summary is then built in `CDEEngine.completeSession()`:
```ts
{
  totalScore,
  riskTier: totalScore >= 9 ? 'HIGH' : totalScore >= 5 ? 'MODERATE' : 'LOW',
  hypotheses: hypotheses.map(h => ({ condition: h.displayName, confidence: h.confidence })),
  layerScores: walker.getLayerScores(),
  conditionTags: store.conditionTags
}
```

The care recommendation is always the hardcoded generic pathway (see Section 4).

### Path B — LLM-Based (no tree questions, minimal fallback tree)

When `ChatOrchestrator` detects a completion sentinel after `processStructuredInput`:

1. Calls `CDEEngine.completeSession()` directly
2. Returns the same hardcoded care recommendation
3. `musculageScore` is 0 (no games were played)
4. Summary fields are computed from the walker state (which has no scored questions — all zeros)

### Is the Summary LLM-Generated?

**No.** The summary data structure (totalScore, riskTier, hypotheses, layerScores) is computed entirely from the decision tree scoring logic. The LLM does not generate the summary. It only formats individual CDE outputs (game recommendations, care recommendations) into prose when the formatting call is triggered. The Results Page renders the structured data directly from the API response.

### JSON Exposure to UI

The structured summary JSON is returned from `GET /api/cde/scan/{id}` and consumed directly by the Results Page components:
- `RiskTierBadge` receives `summary.riskTier`
- `MusculageSummary` receives `musculageScore` and a static breakdown array
- `ScoreCard` receives individual game results from `gameResults`
- `CarePathwayCard` receives `careRecommendation`
- `CrossScanCard` receives `crossScanRecommendations` (currently always `[]`)

---

## 9. Red Flag Safety System

**File:** `src/server/cde/safety/red-flag-engine.ts` and `red-flag-registry.ts`

The red flag system is the most complete part of the codebase. 19 clinical red flags are defined across four urgency tiers:

| Tier | Count | Examples |
|------|-------|---------|
| IMMEDIATE | 7 | Cauda equina syndrome, cervical myelopathy, cardiac (shoulder/arm pain + chest tightness), septic arthritis |
| URGENT_24H | 2 | Progressive neurological deficit, acute rotator cuff rupture |
| URGENT_48H | 4 | PAD/claudication, diabetic foot, early RA window, cancer/infection |
| SPECIALIST_2_4_WEEKS | 3 | RA differentiation, ankylosing spondylitis, gout |

### Evaluation

Red flags are checked at two points in the message flow:
1. In `ChatOrchestrator.processMessage()` — after every LLM extraction
2. In `CDEEngine.processStructuredInput()` — before tree advancement
3. In `TreeWalker.processAnswer()` — after every Layer 0 structured answer (via `question.redFlagHalt` map and `evaluateRedFlags()`)

When a red flag triggers, the session is halted immediately. The UI shows a `RedFlagAlert` component with the halt message and action instruction. The halt is recorded in `cdeScanSessions.status = 'halted'` and in the audit log.

---

## 10. Audit System

**File:** `src/server/cde/engine/audit-logger.ts`

Every engine decision is logged to an in-memory buffer (`entries[]`). The buffer auto-flushes to `cdeAuditLog` when it reaches 50 entries, or is manually flushed via `flush()`.

Events logged include: `question_presented`, `question_answered`, `question_auto_skipped`, `red_flag_check`, `session_halted`, `hypothesis_evaluated`, `game_recommendation`, `assessment_completed`, `cross_scan_triggered`.

`requiresClinicianReview` is set to `true` for `red_flag_check` (when triggered) and `session_halted` events.

---

## 11. Key Gaps

The following are differences between what the code does and what a complete clinical decision engine would be expected to do. These are observations from code analysis only.

### G1 — LLM Provider Mismatch
`llm-client.ts` is exported as `callClaude` but calls OpenAI (`gpt-4o-mini`). All comments and naming in the codebase refer to Claude. The environment variable expected is `OPENAI_API_KEY`.

### G2 — Percentile Calculation Is a Stub
`CDEEngine.calculatePercentile()` returns `Math.min(99, Math.max(1, Math.round(rawScore)))`. The `cdeNormativeData` table (age bands, sex-adjusted percentiles, sample sizes) is defined in the schema and seeded with no data, but is never queried.

### G3 — Care Recommendation Always Generic
`CDEEngine.completeSession()` returns a hardcoded `cp_guided_general` pathway for every session regardless of condition, risk tier, or hypothesis. The `careMatchingRules` array in `low-back-pain.json` is present in the tree definition but is never evaluated by the engine.

### G4 — Only One Tree File Exists
Only `low-back-pain.json` is implemented. The seven conditions listed on the scan entry page (sciatica, disc bulge, spondylosis, osteoarthritis, osteoporosis, rheumatoid arthritis, rotator cuff) and the wellness scan type all fall through to the minimal fallback tree with empty question arrays.

### G5 — Interpreter Modules Are Empty
Three files exist at `src/server/cde/interpreter/` (`score-interpreter.ts`, `game-recommender.ts`, `care-matcher.ts`) but all are empty (`export {}`). Score interpretation, game selection, and care matching logic is instead inlined as stubs directly in `CDEEngine`.

### G6 — Admin API Routes Are Empty Stubs
`GET /api/cde/admin/trees` and `GET /api/cde/admin/audit/[sessionId]` exist as files but contain only `export const dynamic = 'force-dynamic'`. No handler is implemented.

### G7 — Walker Cache Has No Eviction
`walkerCache` in `CDEEngine` is an in-memory `Map<string, TreeWalker>`. Entries are added when sessions start but never removed. In production this would grow without bound for the lifetime of the server process.

### G8 — Ontology Tables Unused at Runtime
`cdeBodyRegions` and `cdeConditions` are defined in the schema and populated by `seed-ontology.ts`. No runtime code queries these tables. The corresponding source files `body-regions.ts`, `conditions.ts`, `parameters.ts` are empty.

### G9 — Tree Loader Not Used by Engine
`src/server/cde/trees/tree-loader.ts` provides a proper caching/validation loader with a 5-minute TTL. `CDEEngine.startSession()` does not call it — it has its own inline `require()` loading logic with different filename derivation rules.

### G10 — musculageScore Is Zero for All Non-Game Paths
The `musculageScore` displayed on the results page is the average of game result percentiles. Since games are only reached when a hypothesis with `recommendedGames` fires, and since no hypotheses fire on the minimal fallback tree, `musculageScore` is 0 for all scans other than a complete low-back-pain assessment.

### G11 — guardrails.ts and contraindications.ts Are Empty
Both files exist in `src/server/cde/safety/` but export nothing. Game contraindication filtering in `TreeWalker.collectRecommendedGames()` uses the `contraindicatedGames[]` field on each hypothesis, but the formal contraindications module is absent.

### G12 — cross-scan Recommendations Always Empty
`GET /api/cde/scan/[id]` returns `crossScanRecommendations: []` hardcoded. The `CDEEngine.completeSession()` searches `auditEntries` for `cross_scan_triggered` events to populate this, but the audit entries are in-memory per-walker-instance and are lost when a session is loaded from DB (new walker instantiated, no prior audit history).

---

## 12. Conclusion

The Kriya CDE is a structurally sound application with a well-designed architecture. The foundational components — the red flag safety system, the decision tree scoring model, the FactStore, the audit trail, and the LLM extraction pipeline — are functional and correctly integrated.

The system is capable of delivering a complete end-to-end scan for lower back pain entered via the body map selector, including structured questions, risk scoring, hypothesis generation, and a results page. The LLM conversation layer correctly extracts clinical facts, avoids re-asking known information, and hands off to the tree engine when sufficient data is collected.

The primary gaps are in breadth (only one tree, generic care recommendation, empty interpreter modules) and in production hardening (no cache eviction, stub percentile calculations, no normative data). The core pipeline design is intact and the extension points are clearly defined — the remaining work is implementation of the content and data layers rather than architectural change.

---

*Generated: 2026-04-02 | Based on static analysis of `src/` at revision current*
