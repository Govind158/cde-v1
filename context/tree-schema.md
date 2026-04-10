# Decision Tree JSON Schema Reference

> Every decision tree JSON file follows this exact schema. TreeWalker dispatches based on `type`. Claude Code MUST read this before creating or modifying any tree.

---

## Top-Level Structure

```json
{
  "id": "DT_LBP_001",
  "version": "3.0",
  "bodyRegion": "lumbar_spine",
  "displayName": "Low Back Pain Assessment",
  "entryConditions": {
    "bodyRegion": ["lumbar_spine"],
    "symptoms": ["pain", "stiffness", "numbness"]
  },
  "nodes": [ ... ]
}
```

## Node Types — Complete Reference

### 1. `red_flag_screen`

First node in every tree. YES answer halts session immediately.

```json
{
  "id": "LBP_RF_001",
  "type": "red_flag_screen",
  "phase": "safety",
  "questions": [
    {
      "id": "rf_cauda_equina",
      "text": "Are you experiencing loss of bladder or bowel control...?",
      "mapsTo": "redFlags.caudaEquina",
      "haltOnYes": true,
      "haltMessage": "This requires immediate medical attention.",
      "options": [
        {"label": "Yes — I am experiencing one or more of these", "value": true},
        {"label": "No — none of the above", "value": false}
      ]
    }
  ],
  "on_all_clear": "LBP_PROFILE_001"
}
```

**Required fields:** `id`, `type`, `questions` (≥1), `on_all_clear`
**Handler:** `handleRedFlagNode` — if any answer is `true` → halt. If all `false` → advance to `on_all_clear`.

### 2. `symptom_profiling`

Collects clinical symptom data. May contain `branching` on specific questions.

```json
{
  "id": "LBP_PROFILE_001",
  "type": "symptom_profiling",
  "phase": "understanding",
  "questions": [
    {
      "id": "sp_duration",
      "text": "How long have you been experiencing pain?",
      "mapsTo": "duration",
      "options": [
        {"label": "Less than 6 weeks", "value": "acute_0_6_weeks", "score": 0},
        {"label": "6 to 12 weeks", "value": "subacute_6_12_weeks", "score": 1},
        {"label": "More than 3 months", "value": "chronic_over_12_weeks", "score": 2}
      ]
    },
    {
      "id": "sp_severity",
      "text": "Pain 0-10?",
      "mapsTo": "severity",
      "inputType": "numeric_scale",
      "min": 0,
      "max": 10
    },
    {
      "id": "sp_pattern",
      "text": "When is your pain typically at its worst?",
      "mapsTo": "painPattern",
      "allowMultiple": true,
      "options": [
        {"label": "First thing in the morning (stiffness)", "value": "morning_stiffness", "score": 1},
        {"label": "After sitting for a long time", "value": "prolonged_sitting", "score": 1},
        {"label": "During or after physical activity", "value": "activity_related", "score": 1},
        {"label": "Toward the end of the day", "value": "end_of_day", "score": 1},
        {"label": "It's constant — never really goes away", "value": "constant", "score": 2}
      ]
    },
    {
      "id": "sp_radiation",
      "text": "Does your pain stay in your lower back, or does it travel?",
      "mapsTo": "radiation",
      "branching": {
        "buttock_referral": "LBP_BUTTOCK_001",
        "radicular_above_knee": "LBP_RADICULAR_001",
        "radicular_below_knee": "LBP_RADICULAR_001"
      },
      "options": [
        {"label": "Stays in my lower back only", "value": "localized", "score": 0},
        {"label": "Travels into one or both buttocks", "value": "buttock_referral", "score": 1},
        {"label": "Travels down my leg but stays above the knee", "value": "radicular_above_knee", "score": 2},
        {"label": "Travels down my leg below the knee", "value": "radicular_below_knee", "score": 2}
      ]
    }
  ],
  "next": "LBP_AGGRAVATING_001"
}
```

**Required fields:** `id`, `type`, `questions` (≥1), `next`
**Optional:** `branching` on individual questions
**Handler:** `handleQuestionNode`
**Branching rule:** Only fire on EXPLICIT answer-value match. No `default` key. If no match → continue to next question in same node.

### 3. `differential_assessment`

Branch-specific deep questions (e.g., radicular, buttock, nerve, headache branches).

```json
{
  "id": "LBP_RADICULAR_001",
  "type": "differential_assessment",
  "phase": "investigation",
  "questions": [
    {
      "id": "rad_dermatome",
      "text": "Where does the pain travel to?",
      "mapsTo": "dermatome",
      "options": [ ... ]
    }
  ],
  "next": "LBP_FUNCTIONAL_001"
}
```

**Same schema as `symptom_profiling`** — `handleQuestionNode` handles both.
**`next` MUST point to a node that rejoins the main flow** (typically functional assessment or aggravating factors).

### 4. `functional_assessment`

Always has exactly 3 questions: sleep, work, exercise. Each scored 0-3. Sum → interpretation.

```json
{
  "id": "LBP_FUNCTIONAL_001",
  "type": "functional_assessment",
  "phase": "impact",
  "questions": [
    {
      "id": "fn_sleep",
      "text": "How much does your pain affect your sleep?",
      "mapsTo": "functionalImpact.sleep",
      "options": [
        {"label": "Not at all", "value": 0, "score": 0},
        {"label": "Occasionally disturbs my sleep", "value": 1, "score": 1},
        {"label": "Regularly disturbs my sleep", "value": 2, "score": 2},
        {"label": "Severely impacts my sleep most nights", "value": 3, "score": 3}
      ]
    },
    { "id": "fn_work", "mapsTo": "functionalImpact.work", ... },
    { "id": "fn_exercise", "mapsTo": "functionalImpact.exercise", ... }
  ],
  "scoring": {
    "method": "sum",
    "mapsTo": "functionalScore",
    "interpretation": {
      "0-2": "minimal_functional_impact",
      "3-5": "moderate_functional_impact",
      "6-9": "severe_functional_impact"
    },
    "interpretationMapsTo": "functionalImpact"
  },
  "next": "LBP_HYPOTHESIS_001"
}
```

**Required fields:** `id`, `type`, `questions` (exactly 3), `scoring`, `next`
**Handler:** `handleQuestionNode` with scoring computation on node completion.

### 5. `hypothesis_generation`

NO questions. Auto-evaluates rules against FactStore. Stores matched hypotheses.

```json
{
  "id": "LBP_HYPOTHESIS_001",
  "type": "hypothesis_generation",
  "phase": "clinical_reasoning",
  "rules": [
    {
      "ruleId": "hyp_postural_lbp",
      "conditionId": "non_specific_lbp",
      "subtype": "postural",
      "displayName": "Postural Lower Back Pain",
      "matchCriteria": {
        "ALL": [
          {"field": "radiation", "equals": "localized"},
          {"field": "aggravatingFactors", "containsAny": ["sitting", "standing"]},
          {"field": "painPattern", "containsAny": ["end_of_day", "prolonged_sitting"]}
        ]
      },
      "confidence": "high",
      "recommendedGames": ["NN2", "FA3", "BB1"],
      "contraindicatedGames": []
    }
  ],
  "next": "LBP_ASSESS_REC_001"
}
```

**Required fields:** `id`, `type`, `rules` (≥1), `next`
**MUST NOT have `questions`**
**Handler:** `handleHypothesisNode` — evaluates each rule, stores `activeHypotheses` + `recommendedGames` in FactStore, auto-advances.

### 6. `assessment_recommendation`

NO questions. Calls game recommender. Returns `game_recommendation` output. **PAUSES the tree** until all game results are received.

```json
{
  "id": "LBP_ASSESS_REC_001",
  "type": "assessment_recommendation",
  "phase": "testing",
  "maxGamesPerSession": 3,
  "next_after_games": "LBP_CARE_MATCH_001"
}
```

**Required fields:** `id`, `type`, `next_after_games`
**Handler:** `handleAssessmentNode` — reads `recommendedGames` from FactStore, stores `afterGamesNodeId`, returns game list to client.

### 7. `score_interpretation`

NO questions. Processes game results into percentile bands and clinical relevance.

```json
{
  "id": "LBP_INTERPRET_001",
  "type": "score_interpretation",
  "phase": "analysis",
  "next": "LBP_CARE_MATCH_001"
}
```

**Optional node** — can be skipped if interpretation happens in `processGameResult()`.

### 8. `care_pathway_matching`

Terminal node. NO questions. Runs care matcher → produces final recommendation.

```json
{
  "id": "LBP_CARE_MATCH_001",
  "type": "care_pathway_matching",
  "phase": "recommendation"
}
```

**Required fields:** `id`, `type`
**NO `next` field** — this is the terminal node.
**Handler:** `handleCareNode` → calls `completeSession()`.

---

## Match Criteria Operators

Used in hypothesis rules' `matchCriteria`:

| Operator | Syntax | Meaning |
|----------|--------|---------|
| `equals` | `{"field": "x", "equals": "val"}` | Exact match |
| `in` | `{"field": "x", "in": ["a","b"]}` | Value is one of |
| `contains` | `{"field": "x", "contains": "val"}` | Array field includes value |
| `containsAny` | `{"field": "x", "containsAny": ["a","b"]}` | Array field includes any |
| `greaterThan` | `{"field": "x", "greaterThan": 5}` | Numeric comparison |
| `lessThan` | `{"field": "x", "lessThan": 18}` | Numeric comparison |
| `between` | `{"field": "x", "between": [13, 25]}` | Inclusive range |

Wrap in `ALL` (every criterion must match), `ANY` (at least one), or `NONE` (none must match).

---

## Validation Checklist (Before committing any tree JSON)

- [ ] Every `next` and `on_all_clear` references a node ID that exists in `nodes[]`
- [ ] Every `branching` value references an existing node ID
- [ ] No `default` key in any `branching` object
- [ ] Every non-terminal node has `next` or `on_all_clear`
- [ ] Question nodes have `questions.length ≥ 1`
- [ ] Computation nodes (hypothesis, assessment, interpretation, care) have NO `questions`
- [ ] Every `mapsTo` is a valid FactStore key
- [ ] No two questions in different nodes write to the same `mapsTo` key
- [ ] Every hypothesis rule's `matchCriteria` fields are populated by some question's `mapsTo`
- [ ] JSON is valid: `node -e "JSON.parse(require('fs').readFileSync('FILE')); console.log('OK')"`
