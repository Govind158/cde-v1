# Kriya Pain Diagnostics — Product Documentation

**Version:** 1.0
**Last updated:** 2026-04-22
**Owner:** Govind (Kriya)
**Repository:** `C:\Users\HP\cde` (Next.js 14 project)

---

## 1. Executive Summary

Kriya Pain Diagnostics is a conversational, self-serve musculoskeletal (MSK) triage tool that walks a user through ~25 structured questions about their pain and returns a probabilistic triage result — top-3 most likely conditions, severity bucket, confidence level, and a recommended action (self-care, consult physiotherapist, consult physician, or seek emergency care).

The product replaces a clinician-guided intake interview with a deterministic, explainable, browser-side engine. All clinical reasoning — scoring, severity, confidence, ranking — is computed client-side in pure TypeScript. A thin server-side LLM layer (`/api/extract`, OpenAI `gpt-4o-mini`) is used **only** to translate free-text answers into structured field patches. The LLM never diagnoses, never scores, never picks the next question.

The engine covers **46 conditions** across **4 body-region buckets** (back, neck, shoulder, knee).

---

## 2. What the Product Is

Kriya Pain Diagnostics is a chat interface served at `/app/scan` inside the Kriya.care domain. It has two defining characteristics:

**Deterministic clinical reasoning.** Every diagnostic output is reproducible. Given the same `PatientData` object, the engine always produces the same top-3 ranking, the same severity bucket, and the same confidence level. There is no probabilistic clinical model, no vector search, no LLM-as-judge.

**LLM as translator, not physician.** The product supports free-text answers (e.g. "I've had a dull ache in my lower back for about two months, worse when I sit") because forcing chip taps for every question is unfriendly. The LLM's only job is to read that free text and emit structured patches — `{ L030201: 'Lower back', L150101: 'Since last 3 months', L030401: 'Dull, persistent' }` — which the user then confirms with a tap before they are merged into state.

This architecture means the product can be audited, regulated, and version-controlled like a rules-based medical device — while still offering the input flexibility of a modern chatbot.

---

## 3. Who It Serves

**Primary user:** An adult (18+) experiencing musculoskeletal pain who wants a first-line assessment before deciding whether to self-manage, see a physiotherapist, or escalate to a physician. The user is not a clinician and is not expected to know diagnostic vocabulary.

**Why they come:**
- They are unsure whether their pain is concerning enough to see a doctor.
- They want a vocabulary to describe what they are feeling before a consultation.
- They want to know if their pain pattern matches a recognisable condition.
- They want to know if there are any red-flag signs they should not ignore.

**What they get (in one 5-minute session):**
- A ranked top-3 list of candidate conditions for their pain region.
- A severity bucket: Mild / Moderate / Severe / Emergency.
- A confidence label: High / Moderate / Low — reflecting how separated the top hypothesis is from the runners-up.
- A recommended action tied to the severity + top condition (self-care vs. physio vs. physician vs. emergency).
- A standard disclaimer that the output is not a diagnosis and does not replace a clinician.

**What they do not get:** prescriptions, exercise programmes, booking flows, or any claim of medical certification. The product is positioned as a triage aid, not a diagnostic device.

---

## 4. Functional Documentation

### 4.1 Core User Flow

```
Land on /app/scan
    → Welcome bubble ("Begin" button)
    → Demographics (gender → age → height+weight → occupation → exercise)
    → Pain region (primary, optional secondary)
    → Pain description, scale 1-10, feeling, activity relationship
    → Accompanying symptoms + trend
    → Medical history (conditions, diagnoses, deficiencies, surgeries)
    → Onset & aggravators (first incidence, aggravator, aggravation duration)
    → Relief (activity + duration)
    → Past treatment (+ outcome if any)
    → Processing animation
    → Result card (top-3, severity, confidence, action)
    → Restart
```

The flow is defined as a single `FLOW` array in `src/components/diagnostics/questionnaire.ts` — this is the single source of truth for ordering and branching. Adding or reordering a question means editing `FLOW`, nothing else.

### 4.2 Branching

Branching is expressed as pure functions on each node:

```ts
next: (data) => data.L190201?.includes("doesn't aggravate")
  ? 'relief'
  : 'aggravation-duration'
```

Notable branches:
- **No pain** → skip directly to processing (short result: "No pain? Great — here's a healthy-habits reminder").
- **Pain doesn't aggravate** → skip aggravation-duration, go straight to relief.
- **Pain doesn't reduce** → skip relief-duration.
- **No past treatment** → skip treatment-outcome.
- **No recent surgery** → skip surgery-recent follow-up.
- **Medical conditions flagged** → queue dynamic `FU_<condition>` follow-up questions before advancing.

### 4.3 Two Input Paths

**Path A — Structured chip / slider / number / height-weight.**
User taps a chip or submits a number. The orchestrator commits the value into `PatientData`, emits any post-node side-effects (height insight, BMI card, mini-diagnosis, red-flag halt, severity pill), and advances via `node.next(data)`.

**Path B — Free-text.**
Every question has a shared free-text bar below the chip options. The user can type "I'm 42, female, height 165, weight 68, had lower back pain for 3 months, worse when sitting" and submit. The orchestrator:
1. POSTs to `/api/extract` with the text + a catalogue of extractable fields.
2. The server calls OpenAI `gpt-4o-mini` in JSON mode with a system prompt that forbids clinical reasoning.
3. The server validates every returned value against the enum options declared in `src/lib/extract-schema.ts` — off-enum strings are dropped, numbers are rounded/clamped.
4. A human-readable `extraction-summary` bubble is rendered with **Confirm** / **Edit** buttons.
5. On Confirm, patches are merged into `PatientData`, any dynamic follow-ups are queued, and the flow advances to the first unanswered node (via `findNextUnansweredFrom`, which walks `FLOW` and skips over any question whose field is already filled).

Both paths end at the same `PatientData` object and the same `runEngine(data)` call. The LLM is never a shortcut around the questionnaire — it only pre-fills chip-equivalent answers for the user to confirm.

### 4.4 Side Effects Along the Flow

Along the questionnaire, the bot emits contextual bubbles that give the user feedback before the final result:

- **Height insight** — a one-liner after height capture.
- **BMI card** — calculated live after weight, with a category (Underweight / Healthy / Overweight / Obese) and colour.
- **Mini-diagnosis** — after the activity-relationship question, an activity-based insight ("Pain that's worse with sitting often points to a postural component").
- **Severity pill** — after the trend question, a preliminary severity colour based on pain scale + description.
- **Red-flag halt** — if the user reports loss of bowel/bladder control, a red-flag bubble is emitted immediately and the flow continues (Cauda Equina will surface in the top-3).

These side effects are scripted in each node's `postBubbles(data)` hook — they are not clinical decisions, only user feedback.

### 4.5 Scoring Output

For each of the 46 conditions, the engine computes a score on a 0–30 scale derived from additive rules:

| Signal | Weight |
|---|---|
| Feeling match (constant / intermittent) | +2 |
| Aggravator match (fuzzy, capped at 8) | +1.5 each |
| Reliever match (fuzzy) | +1.5 each |
| Duration match (acute / chronic / either) | +2 |
| Trend match (worsening exact) | +2 |
| Trend match (progressive / worse synonym) | +1 |
| Trend match (improving / same) | +1.5 / +1 |
| Neuro symptom + `neuro:'affected'` | +3 |
| No neuro symptom + `neuro:'wnl'` | +1 |
| Feature match (per matched feature) | +1.5 each |
| Age band match | +1.5 or +1 |
| Gender match | +1 or +2 |
| BMI ≥ 30 | +0.5 |
| BMI ≥ 35 + non-green flag | +1 |
| Severe pain (≥8) + red flag | +2 |
| Relapse + chronic | +1 |

**Red-flag gating (clinical safety guard).** If a red-flag condition (Cancer/Malignancy, Cauda Equina, Fractures, Infection) has **zero specific-feature matches**, its score is capped at 2.5. This prevents a red flag from outranking legitimate green/yellow conditions on the strength of non-specific signals alone (chronic + severe + worsening + neuro).

Ties break on the flag weight table: `red:6, yellow:4, green:2` — so within a tied score, a red flag surfaces above a yellow above a green.

### 4.6 Severity & Confidence

**Severity bucket** is computed from: base pain scale, base description (Crippling +5 / Severe +3 / Moderate +2 / comes-and-goes +1.5 / else +1), plus neuro bonuses (Tingling +2 / Weakness +3 / Bowel/bladder +4).

| Bucket | Points | Colour |
|---|---|---|
| Mild | ≤3 | green |
| Moderate | ≤6 | amber |
| Severe | ≤9 | orange |
| Emergency | >9 | red |

**Confidence** is a function of top-1 vs. top-2 score gap:

| Confidence | Rule |
|---|---|
| High | gap ≥ 4 |
| Moderate | gap ≥ 2 |
| Low | gap < 2 |

### 4.7 Result Card

The final bot bubble is a `ResultCard` that renders:
- Top-3 conditions with score, flag colour, and flag label.
- Severity bucket with colour.
- Confidence label.
- Recommended action — derived from the combination of top-condition flag and severity bucket (e.g. `red + Emergency → "Seek emergency care immediately"`, `green + Mild → "Self-care and monitor"`).
- Standard clinical disclaimer.
- A "Start over" button to reset.

---

## 5. Technical Documentation

### 5.1 Architecture — Two Input Paths, One Decision Engine

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (deterministic clinical reasoning)                 │
│                                                             │
│   ChatInput ──────┐                                         │
│   (chips/slider/  │         commit(label, patch)           │
│    number)        ├──►  DiagnosticsChat.tsx  ──►  PatientData
│                   │    (orchestrator)                       │
│   ChatInput ──────┤                                         │
│   (free-text)     │    POST /api/extract                   │
│                   └──►  → server LLM → patches             │
│                                                             │
│                          advance via node.next(data)        │
│                                                             │
│                          runEngine(data)                    │
│                          ├── scoring.ts (scoreAll)          │
│                          ├── scoring.ts (severity)          │
│                          └── conditions-db.ts (46 rules)    │
│                                                             │
│                          ResultCard ← DiagnosticResult      │
└─────────────────────────────────────────────────────────────┘
         ▲                                   │
         │ free text                         │
         │                                   ▼
┌─────────────────────────────────────────────────────────────┐
│  Server — /api/extract (Node runtime)                       │
│                                                             │
│   OpenAI gpt-4o-mini                                        │
│   - JSON mode, temperature 0                                │
│   - SYSTEM_PROMPT forbids clinical reasoning                │
│   - Input: free text + EXTRACT_FIELDS catalogue             │
│   - Output: { patches, labels, notes }                      │
│                                                             │
│   Server-side validation:                                   │
│   - Every enum value snapped to questionnaire options       │
│   - Numbers rounded / clamped                               │
│   - Off-enum values dropped                                 │
└─────────────────────────────────────────────────────────────┘
```

Clinical reasoning lives nowhere except `scoring.ts`. The LLM cannot bypass it. The UI cannot bypass it. The orchestrator cannot bypass it.

### 5.2 Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Inline style objects (primary) + Tailwind CSS (sparingly) |
| Font | Nunito |
| Runtime | Browser for questionnaire / scoring / UI; Node.js runtime for `/api/extract` only |
| LLM | OpenAI `gpt-4o-mini` via native `fetch` — extraction only |
| State | React hooks + an orchestrator-internal FSM in `DiagnosticsChat.tsx` |
| Build | `next build`, `tsc --noEmit` |
| Dependencies | React + Next + native `fetch`. **No new npm dependencies permitted.** |

Path alias: `@/*` → `./src/*`.

### 5.3 Module Map

```
src/
├── app/
│   ├── globals.css              — Tailwind base + keyframes
│   ├── layout.tsx               — Root HTML layout (Nunito, dark bg)
│   ├── page.tsx                 — Redirects / → /app/scan
│   ├── app/scan/page.tsx        — Mounts <DiagnosticsChat />
│   └── api/extract/route.ts     — POST endpoint: free-text → OpenAI → patches
├── lib/
│   └── extract-schema.ts        — EXTRACT_FIELDS catalogue + types
└── components/diagnostics/
    ├── types.ts                 — PatientData, ChatEntry, Condition, etc.
    ├── conditions-db.ts         — 46 conditions keyed by region + FLAG_WEIGHT
    ├── scoring.ts               — mapRegion, scoreAll, severity, colour helpers
    ├── insights.ts              — heightInsight, bmiInsight, ACTIVITY_INSIGHTS
    ├── questionnaire.ts         — FLOW (flow + branching, single source of truth)
    ├── primitives.tsx           — GC (glass card), Btn, Chip, Lbl, KI
    ├── ChatTranscript.tsx       — Scrolling message list + bubble dispatch
    ├── ChatInput.tsx            — Contextual footer input (8 input kinds)
    └── DiagnosticsChat.tsx      — Orchestrator: walks FLOW, emits bubbles, commits
```

### 5.4 Data Model

**`PatientData`** — the single mutable object that accumulates answers. Every key is optional; the flow validates required fields per step. Keys are QC-codes (`L030501` etc.) mirrored in the downstream Kriya clinical stack.

| Key | Meaning |
|---|---|
| `L010301` / `L010401` | age / gender |
| `height`, `weight`, `bmi` | derived at height-weight step |
| `L010701` / `L030101` | occupation / exercise frequency |
| `L030201` / `L030201b` | primary / secondary region |
| `L030401` / `L030501` | pain description / pain scale 1-10 |
| `L030601` / `L030701` | feeling / activity relationship |
| `L030801` / `L030901` | symptoms (multi) / trend |
| `L031001` | medical conditions (multi) |
| `L150101` / `L150102` | duration / relapse |
| `L170101` / `L170201` | diagnoses / deficiencies (multi) |
| `L170301` / `L170302` | past surgery / recent surgery |
| `L190101` / `L190201` / `L190202` | first incidence / aggravator / aggravation duration |
| `L210101` / `L210102` | relief activity / relief duration |
| `L230101` / `L230102` | past treatment / outcome |
| `FU_<condition>` | dynamic follow-up answers |

**`Condition`** — the shape of every entry in `conditions-db.ts`:

```ts
interface Condition {
  name: string;
  flag: 'red' | 'yellow' | 'green';
  age: string;          // e.g. 'any,>55'
  gender: 'both' | 'M>F' | 'F>M' | 'male' | 'female';
  feel: string;         // 'constant' | 'intermittent' | 'constant,intermittent'
  agg: string[];        // aggravator tokens for fuzzy match
  rel: string[];        // reliever tokens for fuzzy match
  dur: string;          // 'acute' | 'chronic' | 'acute,chronic' | 'either'
  status: string;       // 'worsening' | 'progressive' | 'improving' | 'variable' | 'same'
  feat: string[];       // feature tokens matched against user chips + free text
  neuro: 'affected' | 'wnl' | 'maybe';
}
```

**`DiagnosticResult`** — the engine's return type:

```ts
interface DiagnosticResult {
  user: { age?: string; gender?: string; bmi?: number };
  pain: { region?, duration?, scale?, description?, feeling? };
  severity: SeverityResult;          // { total, bucket }
  scores: Record<string, number>;    // condition name → score
  top_3: ScoredCondition[];
  confidence: 'High' | 'Moderate' | 'Low';
  action: string;                    // e.g. "Seek emergency care"
  disclaimer: string;
  noPain?: undefined;
}
```

### 5.5 LLM Integration — `/api/extract`

**Endpoint:** `POST /api/extract`
**Runtime:** Node.js (server-side only).
**Env:** requires `OPENAI_API_KEY` (server-side only; never exposed to the browser).
**Model:** `gpt-4o-mini`, JSON mode, temperature 0.

**System prompt (paraphrased):**
> You extract structured fields from free text about musculoskeletal pain. You MUST NOT evaluate, diagnose, score, or recommend. You MUST only return JSON with `patches` (keyed on the provided schema), `labels` (human-readable), and optional `notes`. You MUST NOT invent values. If a field is absent, omit it.

**Validation layers on the server:**
1. JSON parse guard.
2. Every returned key is checked against the `EXTRACT_FIELDS` catalogue.
3. Every enum value is compared **verbatim** to the questionnaire option list — off-enum drops the field.
4. Numbers are rounded and clamped to plausible ranges (age 1–120, height 50–250cm, weight 20–300kg, pain scale 1–10).

**Client-side confirmation.** Extracted patches never apply silently. They render as an `extraction-summary` bubble with Confirm / Edit buttons. The user must tap Confirm.

### 5.6 Inviolable Rules (Architecture Boundaries)

These rules are enforced by code review and form the product's regulatory story:

1. **LLM is extraction only.** `/api/extract` never evaluates, ranks, computes severity, or picks a next node.
2. **Clinical decisions are client-side and deterministic.** Scoring, severity, confidence, ranking all live in `scoring.ts`. No DB, no server clinical logic.
3. **Enum values are sacred.** `EXTRACT_FIELDS` mirrors `questionnaire.ts` options exactly. Off-enum values are dropped server-side.
4. **Every LLM patch is user-confirmed.** No silent writes to `PatientData`.
5. **Questionnaire is the flow.** Adding / removing / reordering a question means editing `FLOW`. The orchestrator does not hard-code question ids except for well-defined side effects.
6. **Branching lives in `next(data)`.** Not in the orchestrator.
7. **No breaking changes to `PatientData` keys.** Renaming an `L*` key silently invalidates scoring.
8. **No new npm dependencies.** The app builds with React + Next + native fetch.
9. **Scoring is pure.** `scoreAll` and `severity` are side-effect-free and depend only on `PatientData`.
10. **`OPENAI_API_KEY` is server-side only.** Never imported from a client component.

### 5.7 Commands

```bash
npm run dev           # Start dev server
npm run build         # Production build
npm start             # Production server
npm run lint          # next lint
npm run typecheck     # tsc --noEmit (run after every change)
```

### 5.8 Environment

```bash
OPENAI_API_KEY=sk-...   # required for /api/extract, server-side only
```

---

## 6. Clinical Design Principles

The scoring engine is designed around four principles:

**Additivity.** Every clinical signal contributes a small, documented weight. No single signal dominates unless it is a true red-flag feature. This makes the engine auditable — a clinician can explain, for any output, exactly which signals raised which scores.

**Specificity over volume.** Red flags (Cancer, Cauda Equina, Fracture, Infection) are gated on specific-feature matches. A cluster of non-specific signals (chronic + worsening + severe + neuro) alone cannot surface a red flag. Only user-reported specific history (history of cancer, history of fall, bowel/bladder loss, fever, unexplained weight loss) unlocks a red-flag ranking.

**Forward-only feature matching.** The user's chip text must contain the DB's feature token. The reverse direction — "DB feature contains a prefix of the user's chip text" — was removed as a clinical-safety bug: it caused every "History of X" medical-condition chip to false-match `history of cancer` via the shared `histor` prefix.

**Conservative escalation.** Severity's neuro bonuses (Tingling +2, Weakness +3, Bowel/bladder +4) push any neuro-positive presentation into Severe or Emergency even if the pain scale is moderate, because MSK emergencies present with neurological signs, not with pain intensity.

---

## 7. Non-Goals & Boundaries

The product explicitly **does not**:

- Issue diagnoses. Every output is framed as a ranked hypothesis with a disclaimer.
- Issue prescriptions or treatment plans.
- Book appointments or refer to providers.
- Store user data server-side in this release. `PatientData` lives in the browser for the duration of the session. (Integration with the Kriya user account and session persistence is a future release.)
- Integrate with EHRs, insurance, or payment in this release.
- Process pediatric (<18) cases. The demographic step accepts any age but the condition DB is calibrated for adult presentations.
- Claim regulatory certification. The product is positioned as a wellness / triage aid, not a medical device.

---

## 8. Known Gaps & Future Work

**Hip-region coverage.** Hip pain is currently mapped to the `back` bucket (alongside lumbar and SI-joint conditions). The DB has no hip-specific conditions (FAI, trochanteric bursitis, hip OA). Users with hip pain are scored against spinal conditions, which is clinically weak. Fix requires adding hip entries to `conditions-db.ts`.

**Session persistence.** No account tie-in today. A user cannot revisit a past result or track pain over time. Roadmap item: claim an anonymous session on Kriya auth and persist results.

**Reporting & export.** No printable report, no share link. Candidate for a v2 feature.

**Language.** English only.

**Analytics.** No event tracking in this release. Candidate for GA4 integration consistent with the rest of the Kriya platform.

**Expanded region coverage.** The four region buckets (back, neck, shoulder, knee) cover ~85% of primary-care MSK presentations but exclude jaw (TMJ), wrist/hand, foot/ankle, and multi-site pain (fibromyalgia-pattern). Roadmap item for a v2 DB expansion.

---

## 9. Glossary

**QC code** — The `L*` field identifiers (e.g. `L030501`) are Kriya's Questionnaire Catalogue codes, shared with the wider Kriya clinical stack. They are stable identifiers; renaming breaks scoring.

**Red / Yellow / Green flag** — Condition severity classification. Red = potentially serious, needs physician escalation (cancer, cauda equina, infection, fracture). Yellow = needs clinician assessment (disc herniation, radiculopathy, frozen shoulder, inflammatory conditions). Green = typically self-limiting, responds to conservative management (muscle strain, facet joint, postural, SI joint).

**Feature (feat)** — A condition-specific finding (e.g. "history of cancer", "saddle anesthesia", "history of fall"). Feature matches require forward-substring presence of the feat token in the user's chip text or free-text input.

**Fuzzy match** — The aggravator and reliever matchers accept partial overlap: either the user's text contains the token, or the token contains the first word of the user's text. This tolerates phrasing variation without relying on NLP.

**FLOW** — The ordered list of question nodes in `questionnaire.ts`. Each node has `id`, optional `field`, `intro`, `kind`, `options`, `postBubbles(data)`, and `next(data)`. Editing `FLOW` is the only way to change the conversation.

**Extraction** — The process by which free-text answers are turned into chip-equivalent structured fields via the OpenAI `/api/extract` route. Extraction is never a clinical judgment.

---

*End of document.*
