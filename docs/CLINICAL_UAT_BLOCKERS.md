# Kriya CDE v4.1 — Clinical UAT Open Items

**Audience:** Clinical reviewers, founders, engineering leads.
**Build:** CDE-v4.1, stage = `uat`
**As of:** 2026-04-25

This document is the single source of truth for what is *known to be incomplete*
in the Kriya Pain Risk Assessment chatbot during clinical UAT. Each item below
is also visible in-app under the yellow "Clinical UAT — Open Items" panel that
appears on every result card.

When all six items are closed, the build can move from `uat` to `prod` by
flipping one environment variable (`NEXT_PUBLIC_KRIYA_RELEASE_STAGE=prod`).

---

## How to read this doc

Each blocker has four parts:

- **What** — the issue in plain language
- **Why it matters** — what could go wrong if we ship as-is
- **What we recommend** — the specific fix, who needs to act, and effort estimate
- **Status** — open / in review / resolved

---

## B1 — Clinician sign-off pending  🚫 BLOCK

**What.** The v4.1 specification document includes an 18-item sign-off sheet at
the end (the "Clinician sign-off" page). It asks a qualified clinician to tick
items like *"Severity buckets align with standard clinical urgency tiers"*,
*"Per-option weights are proportionate"*, *"Safety gates are sufficient"*, etc.
None of those 18 items has been signed yet.

**Why it matters.** The spec itself positions clinician sign-off as the gate to
production. Without a signature, we are running clinically-weighted scoring
against real users with no licensed practitioner having validated that the
weights are appropriate. The spec author built that gate in for a reason.

**What we recommend.**
- **Owner:** A licensed MSK clinician (preferably the original spec author or
  someone they nominate).
- **Action:** Walk through the 18-item checklist on pages 117–119 of
  `Kriya_CDE_Pain_Risk_Assessment_v4.1.pdf`. Tick what is acceptable. For
  anything not ticked, write the correction inline. We convert each correction
  into a code change with a named test.
- **Effort:** Half-day clinical review + 1–2 days of engineering follow-up
  per substantive correction.
- **Acceptance:** All 18 items signed *or* explicitly waived in writing for the
  UAT scope.

**Status:** Open. This is the largest blocker — no other clinical work is
unblocked until B1 is in motion.

---

## B2 — FINDING-1: Peripheral Neuropathy weights dominate  🚫 BLOCK

**What.** When we run the engine with the spec's own *Worked Example* (Part VII
— a male, 58, with severe lower back pain, weakness, tingling, etc.), the
spec text says **Disc Bulge** should rank #1 with about 24 points and Sciatica
#2 with about 18. But when we use the literal weights in the Part V matrices,
we get this instead:

| Rank | Condition | Score | Flag |
|------|-----------|------:|------|
| 1 | Peripheral Neuropathy | 53 | Yellow |
| 2 | Fracture | 32 | Red |
| 3 | Spondylolisthesis | 30 | Green |

The engine is doing what the spec says. The mismatch is in the spec's own
weights — Peripheral Neuropathy has three +10 weights on signals that fire for
almost any chronic-pain presentation:

- `L030601.A` ("Constant pain") = +10
- `L030901.A` ("Worsening") = +10
- `L190202.A` ("Pain worsens immediately, within 10 min") = +10

The spec author flagged this in their own footnote: *"values above are
illustrative orderings, consistent with the matrices but not recomputed
cell-by-cell."* In other words, they knew there was a gap.

**Why it matters.** Today, virtually any user who reports constant + worsening
back pain that aggravates immediately will see Peripheral Neuropathy as the
top-ranked condition — even if their actual presentation is a textbook disc
bulge. Clinically, that is the wrong primary suggestion.

**What we recommend.**
- **Owner:** Clinical reviewer.
- **Action:** Open the Peripheral Neuropathy matrix on page ~78 of the spec PDF.
  Decide whether the three +10 cells should be:
  1. Reduced to +2 or +5 (most likely),
  2. Restricted to specific co-morbidity patterns (e.g. Diabetic Neuropathy
     should require Diabetes from `L170101`), or
  3. Left as-is with a different cap rule.
- **Effort:** 30–60 minutes clinical review, 1 hour engineering to update the
  JSON, regenerate `conditions-db.ts`, and rerun the worked-example test.
- **Acceptance:** Disc Bulge ranks #1 in the spec's worked example, Sciatica
  ranks #2, *and* Peripheral Neuropathy still surfaces correctly when the
  presentation actually fits diabetic-neuropathy criteria.

**Status:** Open. This is the second hardest blocker because it requires a
clinician to assign new weights, not just review existing ones.

---

## B3 — No automated reconstructability test in CI  ⚠ REVIEW

**What.** Spec Part VIII calls this out explicitly:

> Replaying the engine must reproduce an identical top-3, severity and
> confidence — byte-for-byte. This is testable as a property of the build
> and should be enforced in CI.

We have validated this *manually* by re-implementing the scoring rules in
Python and replaying against the same data. There is no automated TypeScript
test that runs on every commit.

**Why it matters.** Without a CI test, any future engineer can change a weight,
a gate, or a chip label and silently shift a clinical result. A test that
asserts *"these inputs always produce these outputs"* is the safety net that
catches regressions before they reach a user.

**What we recommend.**
- **Owner:** Engineering.
- **Action:** Add `__tests__/cde-replay.test.ts` (Vitest). Pin three scenarios:
  the spec worked example, a cauda-equina trigger, and a no-pain short-circuit.
  For each, assert: top-3 condition names + scores, severity bucket + total,
  confidence label, banner presence, gates fired.
- **Effort:** 2–3 hours engineering. No clinical input required.
- **Acceptance:** `npm test` runs in CI on every commit; failure blocks merge.

**Status:** Open. Low-risk to ship UAT without it (we have manual replay), but
high-value to add before broader rollout.

---

## B4 — No persistent audit-log writer  ⚠ REVIEW

**What.** Spec Part VIII requires that for every session we store: the QC-keyed
answers, the engine version, the per-condition scoring trace, the severity
calculation, every safety-gate decision, every LLM extraction, every
qualitative observation, and the final routing action. The intent is that any
past clinical decision can be reconstructed and audited.

The engine *generates* all of this data — it's right there in the result
envelope (`trace`, `gates`, `engineVersion`, `contributors`). It just isn't
written anywhere persistent. Nothing logs to a database, file, or session store.

**Why it matters.**
- A clinician auditing a past case can't see *why* the engine ranked what it
  did unless we tell them in real time.
- Any incident review (e.g. *"why did this user not get an emergency banner?"*)
  requires the audit trail.
- Regulatory readiness (CDSCO / FDA-class softwares-as-medical-device) requires
  it.

**What we recommend.**
- **Owner:** Engineering, with input from clinical on data-retention policy.
- **Action:** Two-step.
  1. **Short-term (UAT):** Show the audit trace in the in-app blockers panel
     when stage = `uat` so the clinical team can see it during testing. Already
     partially in place (the `OpenBlockersPanel` is live).
  2. **Pre-prod:** Persist the result envelope to a Postgres `cde_sessions`
     table on session-end. Schema: `(session_id, user_id_or_anonymous,
     engine_version, answers_jsonb, result_jsonb, created_at)`. Encrypted at
     rest. 7-year retention by default (medical-record norm).
- **Effort:** 1 day for the schema + writer + simple read endpoint.
- **Acceptance:** Every completed session creates exactly one row that, when
  replayed, reproduces the exact same result.

**Status:** Open. Acceptable to defer for clinical UAT; not acceptable for
public production.

---

## B5 — Meta-request handling not wired into the chat UI  ⚠ REVIEW

**What.** The spec's LLM Extraction Mandate (Part I.2) says the bot must
recognise when a user types something that isn't an answer but a request to
manage the flow:

| User says | Bot should |
|-----------|-----------|
| *"Go back / change my last answer"* | Revert to the previous question, overwrite the stored answer. |
| *"I don't understand the question"* | Re-phrase using a clarification bank, do not advance. |
| *"Can you repeat?"* | Re-present the question verbatim. |
| *"Skip this"* | Record as declined; for critical questions (neuro, fever, night pain) insist once. |
| *"End the assessment"* | Save & resume; show partial summary if possible. |

The detection is wired up — the API route returns `metaRequest` when it
recognises these patterns. The chat orchestrator just hasn't been taught what
to do with them yet, so today they get silently ignored.

**Why it matters.** A user who types *"I want to change my last answer"* will
see no acknowledgement. A user who says *"skip this question"* on a critical
red-flag question (e.g. weakness or bowel/bladder) will get past it without us
asking why. That second case is a clinical safety gap.

**What we recommend.**
- **Owner:** Engineering, with UX guidance on the clarification bank.
- **Action:** Three orchestrator handlers:
  1. `edit_previous` — pop the last answer, re-show the previous question with
     a "you can change your answer" hint.
  2. `repeat` / `clarify` — re-emit the question; clarify uses a per-question
     plain-language explanation (the clarification bank — clinical authoring
     work).
  3. `skip` / `end_session` — for non-critical questions, record "user
     declined" and advance. For the eight critical questions
     (`L030801.B/C/D`, `L031001.G/H`, `L031008.A`, plus cauda-equina relevant
     items), re-ask once with a gentle rationale, then route to a human-in-the-
     loop handoff if the user still declines.
- **Effort:** 2 days engineering + 1 day clinical authoring of the
  clarification bank.
- **Acceptance:** The five meta-requests above all produce visible flow
  changes. Critical-question skips trigger the insist-once behaviour.

**Status:** Open. The detection layer is shipping in UAT — the missing UI just
means the patterns get ignored, not misinterpreted. Acceptable for clinical
UAT (clinicians know to use chips); not acceptable for general public release.

---

## B6 — Knee region has only 5 of 21 conditions  ⚠ REVIEW

**What.** Spec Annex C explicitly states that the knee region is incomplete:
the spec lists 21 knee conditions in the flag table but provides scoring
matrices for only 5 (Cancer/Infection, Dislocated Knee Cap, Stress Fracture,
Patellar Tendinopathy, Ligament/Meniscal). The other 16 are listed by name
but with no weights. Annex C provides a blank template the clinician should
fill in.

**Why it matters.**
- Of the 5 we have, four are RED-flag conditions (Cancer/Infection, Dislocated
  Knee Cap, Stress Fracture, Ligament/Meniscal). The red-flag safety gate
  (which prevents false positives) will suppress most of those unless the
  presentation is dominant.
- That leaves Patellar Tendinopathy as effectively the only consistently
  surfaceable knee condition.
- A user with a real knee complaint (Patellofemoral Pain, ACL injury, MCL
  tear, ITB syndrome, bursitis, meniscal tear, Osgood-Schlatter, etc.) will
  see at most 1–2 candidates, none of which may be the right one.

**What we recommend.**
- **Owner:** Clinical reviewer.
- **Action:** Fill in Annex C's matrix template for the 16 missing conditions.
  The template is one row per QC code with weights to write in. Same
  conventions as the existing knee 5: +2 for weakly-specific signals, +5 for
  moderately-specific, +10 for highly-specific or pathognomonic.
- **Effort:** Estimated 3–5 hours clinical work. Engineering effort is then
  trivial: re-run `python3 scripts/extract_matrices.py` after the spec PDF is
  updated.
- **Acceptance:** All 21 knee conditions have non-empty matrices. A user with
  a typical knee complaint sees a top-3 that includes plausible green-flag
  conditions.

**Interim mitigation.** If we cannot complete B6 before patient launch, the
knee region can be gated separately to a "knee complaint detected — please
book a specialist consult" pathway. We do *not* show patient-facing knee
results from a 5-condition pool.

**Status:** Open. Acceptable for clinical UAT (clinicians can stress-test
knee scenarios and document the gaps themselves). Must be closed before any
patient-facing launch involving knee complaints.

---

## Summary table — what blocks what

| Item | Severity | Blocks UAT? | Blocks public production? | Owner |
|------|----------|:-----------:|:-------------------------:|-------|
| B1 — Clinician sign-off | BLOCK | No | **Yes** | Clinical |
| B2 — Peripheral Neuropathy weights | BLOCK | No | **Yes** | Clinical |
| B3 — Reconstructability CI test | REVIEW | No | Recommended | Engineering |
| B4 — Persistent audit log | REVIEW | No | **Yes** | Engineering + Clinical (retention) |
| B5 — Meta-request UI | REVIEW | No | **Yes** | Engineering + Clinical (clarification bank) |
| B6 — Knee 16 missing matrices | REVIEW | No | **Yes** for knee complaints | Clinical |

UAT is unblocked today. Public production needs all six closed (B3 is
strictly recommended, not strictly blocking).

---

## Production go-live flow

```
[B1 signed]  +  [B2 weights adjudicated]  +  [regenerate conditions-db.ts]
       │
       ▼
[B3 CI test added]  +  [B4 audit-log writer]  +  [B5 meta-request UI]
       │
       ▼
[B6 — only if launching knee region publicly]
       │
       ▼
[Run worked-example test, cauda-equina test, end-to-end UAT walkthrough]
       │
       ▼
[Set NEXT_PUBLIC_KRIYA_RELEASE_STAGE=prod, redeploy]
```

---

## Where to find the engine internals

If a clinician or reviewer wants to see exactly how a result was computed:

- **Per-condition weights:** `src/components/diagnostics/conditions-db.ts`
- **Scoring algorithm + safety gates:** `src/components/diagnostics/scoring.ts`
- **Severity rules:** `computeSeverity()` in `scoring.ts`
- **Question wording:** `src/components/diagnostics/questionnaire.ts`
- **Spec source of truth:** `Kriya_CDE_Pain_Risk_Assessment_v4.1.pdf`
- **Open-blockers list shown in-app:** `src/lib/release-stage.ts` (edit
  `OPEN_BLOCKERS` array as items close)

---

## How to close an item

When a blocker is resolved:

1. Make the code/clinical change.
2. Open `src/lib/release-stage.ts` and remove that entry from the
   `OPEN_BLOCKERS` array.
3. Update this document — change the status to `Resolved YYYY-MM-DD` and add
   a one-line note describing the fix.
4. Commit. The in-app panel updates automatically on next deploy.

When the array is empty *and* the env var is set to `prod`, the panel
disappears entirely and you are in production mode.
