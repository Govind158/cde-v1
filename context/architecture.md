# Architecture — Living Document

> **Last updated:** Based on codebase state after LBP tree implementation + 8 rounds of bug fixes.
> **Rule:** Update this file whenever the codebase changes. This replaces the stale SYSTEM_DOCUMENTATION.md.

---

## Request Flow (Current)

```
Browser (React 18 + Zustand)
  │
  ├─ Free text message ──→ POST /api/cde/scan/message
  │                            │
  │                            ├─ ChatOrchestrator.processMessage()
  │                            │   ├─ Check treeActive flag → if true, block LLM, return "use buttons"
  │                            │   ├─ Check if numeric answer for active question → route to processAnswer
  │                            │   ├─ LLM extraction call (gpt-4o-mini)
  │                            │   ├─ parseExtraction() — 6-strategy robust parser
  │                            │   ├─ sanitizeResponseForClient() — strip any leaked JSON
  │                            │   ├─ FactStore.update() with extracted fields
  │                            │   ├─ Check isCDEReady() — engine overrides LLM's cdeReady
  │                            │   └─ If ready → CDEEngine.processStructuredInput() → tree starts
  │                            │
  │                            └─ Return { conversationResponse, cdeOutput, sessionState }
  │
  ├─ Button click ──→ POST /api/cde/scan/answer
  │                       │
  │                       ├─ CDEEngine.processAnswer(sessionId, questionId, value)
  │                       │   ├─ Set treeActive = true, _treeQuestionsAnswered++
  │                       │   ├─ Store _activeQuestion for next question
  │                       │   ├─ TreeWalker.processAnswer() → score, store in FactStore
  │                       │   ├─ Check branching → advance to branch node or next question
  │                       │   ├─ If node complete → advance to next node
  │                       │   ├─ If hypothesis_generation → auto-evaluate rules
  │                       │   ├─ If assessment_recommendation → return game_recommendation
  │                       │   └─ If care_pathway_matching → completeSession()
  │                       │
  │                       └─ Return { cdeOutput (question | game_recommendation | complete) }
  │
  ├─ Game result ──→ POST /api/cde/scan/game-result
  │                      │
  │                      ├─ CDEEngine.processGameResult()
  │                      │   ├─ Store result with percentile
  │                      │   ├─ Track completed games
  │                      │   ├─ If all games done → completeSession()
  │                      │   └─ Return interpretation + pending count
  │                      │
  │                      └─ Return { type, interpretation, pendingCount }
  │
  └─ Skip games ──→ Client submits dummy scores for all recommended games
                     (same endpoint, same flow, dummy rawScore values)
```

## State Machine — Session Lifecycle

```
CREATED → COLLECTING (LLM extraction) → IN_PROGRESS (tree questions) → GAMES (playing/skipping) → COMPLETED (results)
                                                                              ↑
                                                              HALTED (red flag) ─┘ (no games, no results — emergency referral)
```

## Component-to-Store-to-API Data Flow

```
Results Page                    Zustand Store                    API Response
─────────────                   ────────────                     ────────────
riskLevel badge     ←reads←     results.summary.riskLevel   ←sets←   summary.riskLevel
musculage number    ←reads←     results.summary.musculageScore ←sets← summary.musculageScore
BAL/ROM/MOB/REF     ←reads←     results.summary.parameterScores ←sets← summary.parameterScores
care program card   ←reads←     results.careRecommendation  ←sets←   careRecommendation
option buttons      ←reads←     activeQuestion              ←sets←   cdeOutput.nextQuestion
game recommendations ←reads←    recommendedGames            ←sets←   cdeOutput.games
```

## Parser — 6-Strategy Extraction Parser

The `parseExtraction()` function handles ANY format the LLM might produce:

1. `---EXTRACTION---` delimiter (expected format)
2. `<structured_extraction>` XML tags
3. `### Structured extraction` markdown headers
4. ` ```json ``` ` code blocks
5. Raw JSON object at end of response
6. Fallback: clean response, return null extraction

Plus `sanitizeResponseForClient()` as defense-in-depth at the API boundary.

## TreeWalker Branching Rules

- Branching ONLY fires on **explicit answer-value matches** in the `branching` object
- If no branch key matches the answer → continue to next question in current node
- **NO `default` key** in branching that jumps to another node
- Branch nodes (radicular, buttock, nerve, headache) always rejoin the main flow via their `next` field

## FactStore Key Registry

| Key | Type | Written By | Read By |
|-----|------|-----------|---------|
| `bodyRegion` | string | LLM extraction | TreeWalker (tree selection) |
| `severity` | number (0-10) | LLM extraction or tree | Risk stratifier |
| `duration` | string enum | LLM extraction or tree | Risk stratifier, hypothesis rules |
| `painPattern` | string[] | Tree question | Hypothesis rules |
| `radiation` | string enum | Tree question | Branching logic, hypothesis rules |
| `aggravatingFactors` | string[] | Tree question | Hypothesis rules |
| `easingFactors` | string[] | Tree question | Care matcher |
| `neuroDeficit` | string enum | Tree question (radicular branch) | Risk stratifier, hypothesis rules |
| `functionalScore` | number (0-9) | Tree (sum of sleep+work+exercise) | Risk stratifier |
| `functionalImpact` | string enum | Tree (interpretation of score) | Care matcher |
| `activeHypotheses` | object[] | Hypothesis handler | Game recommender, care matcher |
| `recommendedGames` | string[] | Assessment handler | Game recommendation UI, skip handler |
| `completedGames` | string[] | processGameResult | Game recommender (step 4) |
| `afterGamesNodeId` | string | Assessment handler | processGameResult (resume tree) |
| `_treeActive` | boolean | processAnswer | processMessage (LLM blocking) |
| `_activeQuestion` | object | evaluateCurrentNode | processMessage (numeric answer routing) |
| `_turnCount` | number | FactStore.update() | isCDEReady fallback |
| `redFlags.*` | boolean/null | Tree red flag questions | Red flag engine |

## Implemented vs Stub

| Module | Status |
|--------|--------|
| CDEEngine (index.ts) | ✅ Implemented — session lifecycle, walkerCache, completeSession |
| TreeWalker | ✅ Implemented — 8-type dispatch, branching, scoring |
| FactStore | ✅ Implemented — JSONB-backed |
| ChatOrchestrator | ✅ Implemented — dual LLM, treeActive blocking, numeric routing |
| Extraction Parser | ✅ Implemented — 6-strategy robust parser |
| Red Flag Engine | ✅ Implemented — 19 rules, 4 tiers |
| Risk Stratifier | ✅ Implemented — 6-factor additive, 5 tiers |
| Rule Evaluator | ✅ Implemented — ALL/ANY/NONE |
| Audit Logger | ✅ Implemented — append-only, batch flush |
| Score Interpreter | ⚠️ Partial — percentile = rawScore/maxScore (placeholder, no normative data) |
| Game Recommender | ⚠️ Partial — collects from hypotheses, basic pipeline |
| Care Matcher | ✅ Implemented — multi-factor scoring, 3 LBP pathways |
| Contraindications | ❌ Empty |
| Guardrails | ❌ Empty |
| Ontology runtime | ❌ Not queried at runtime |
| Trees: low-back-pain.json | ✅ Implemented (9 nodes, 4 paths, 7 rules) |
| Trees: all others | ❌ Not created (JSON files needed) |
| Normative data | ❌ DB table empty |
