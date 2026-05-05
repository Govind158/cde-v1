/**
 * Kriya Pain Diagnostics — Chat Orchestrator
 *
 * Walks the questionnaire as a chat. On mount it emits the welcome node's
 * intro bubbles and shows the Begin button. For every question node:
 *
 *   1. Emit each intro line as a bot text bubble (typing pause in between).
 *   2. For chips nodes, append a chips-question bubble in the transcript.
 *   3. For structured inputs (range / number / text / height-weight), show
 *      them in the footer. Footer always exposes the shared free-text bar.
 *   4. When the user commits an answer:
 *       - echo it as a user bubble
 *       - store it in patient data
 *       - emit any postBubbles / postCards (BMI card, mini-diagnosis, severity, red-flag)
 *       - advance to next(data) and repeat
 *
 * On the `processing` node, the engine runs and the result card is appended.
 * Medical-history follow-ups are generated dynamically before advancing.
 *
 * Entirely client-side except for the LLM extraction API call.
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatTranscript } from './ChatTranscript';
import { ChatInput } from './ChatInput';
import { MED_FOLLOWUPS, getNode } from './questionnaire';
import type { QuestionNode } from './questionnaire';
import { bmiInsight, findActivityInsight, heightInsight } from './insights';
import { runEngine as cdeRunEngine, computeSeverity, regionFromPrimary } from './scoring';
import { DB } from './conditions-db';
import type {
  ChatEntry,
  DiagnosticResult,
  EngineOutput,
  NoPainResult,
  PatientData,
} from './types';
import type { ExtractRequest, ExtractResponse } from '@/lib/extract-schema';

interface OrchestratorState {
  currentId: string;
  data: PatientData;
  entries: ChatEntry[];
  typing: boolean;
  /** Pending follow-up conditions (copy of L031001 filtered to those with followups). Consumed one at a time. */
  pendingFollowups: string[];
  /** When non-null, the next user answer is stored under FU_<cond> instead of the current node's field. */
  activeFollowup: string | null;
  /** Result object once the engine has run. */
  result: EngineOutput | null;
  /** When non-null, chat input is disabled awaiting Confirm/Edit on this extraction entry. */
  awaitingExtraction: string | null;
  /**
   * Stack of (nodeId, dataSnapshot) entries pushed BEFORE every commit so we
   * can revert one step on a `meta-request: edit_previous`. v4.4 spec
   * Part I.2 mandate 1: "Revert flow to the previous question. Overwrite the
   * stored response for that QC with the new input."
   */
  history: { nodeId: string; data: PatientData }[];
  /**
   * Per-node skip count, used by the critical-question insist-once logic
   * (v4.4 spec Part I.2 mandate 1: "for critical questions … insist: re-ask
   * once with a gentle rationale … if the user still declines, route to a
   * human-in-the-loop handoff"). Keyed by node id (or `FU:<follow-up label>`
   * for L031002–L031011 follow-ups).
   */
  skipCounts: Record<string, number>;
  /**
   * True when the user has confirmed end_session — locks the orchestrator so
   * subsequent free-text input does nothing.
   */
  ended: boolean;
}

/**
 * Critical question nodes — per v4.4 spec Part I.2 mandate 1, when a user
 * tries to skip these we must insist once with a gentle rationale before
 * accepting the skip (and route to human-in-the-loop on a second skip).
 *
 * Coverage: L030801 symptom multi-select (covers neuro symptoms B, weakness
 * C, bowel/bladder D, balance F — every cauda-equina-relevant signal); the
 * L031001 medical-history multi-select (covers night pain G, fever H); plus
 * the L031008 (severe-night-pain) and L031009 (high-fever) follow-ups, which
 * are presented under medical-conditions while activeFollowup is set.
 */
const CRITICAL_NODES: ReadonlySet<string> = new Set(['symptoms', 'medical-conditions']);
const CRITICAL_FOLLOWUPS: ReadonlySet<string> = new Set([
  'Severe night pain',
  'High grade fever',
]);

const TYPING_DELAY = 450;
const BUBBLE_DELAY = 180;

let entryCounter = 0;
const nextId = (): string => {
  entryCounter += 1;
  return `e${entryCounter}`;
};

interface DiagnosticsChatProps {
  /**
   * Optional pre-filled PatientData. Used when DeepScan is launched as a
   * follow-up from QuickScan: the caller can pre-set L030201 (primary region)
   * so the user does not re-pick. The orchestrator still walks the FLOW
   * starting at `welcome` — pre-filled fields are simply skipped where
   * appropriate (the chip-question is still rendered with the pre-set value
   * resolved, so the user can see and confirm the carry-over).
   *
   * Per CLAUDE.md inviolable rule 7: never rename PatientData keys. This
   * prop only INITIALISES; it never renames or reshapes.
   */
  initialData?: Partial<PatientData>;
  /**
   * Optional callback for the in-app "Back to scan menu" button shown in
   * the header. Omitted when DeepScan is the only entry (legacy / direct
   * /app/scan route).
   */
  onExit?: () => void;
}

export default function DiagnosticsChat({ initialData, onExit }: DiagnosticsChatProps = {}) {
  const [state, setState] = useState<OrchestratorState>({
    currentId: 'welcome',
    data: { L030501: 5, ...(initialData ?? {}) },
    entries: [],
    typing: false,
    pendingFollowups: [],
    activeFollowup: null,
    result: null,
    awaitingExtraction: null,
    history: [],
    skipCounts: {},
    ended: false,
  });

  const mounted = useRef(false);

  // ── Emission helpers ────────────────────────────────────────────
  const emitBubbles = useCallback(async (bubbles: ChatEntry[]): Promise<void> => {
    for (const b of bubbles) {
      // Typing indicator
      setState((s) => ({ ...s, typing: true }));
      await wait(TYPING_DELAY);
      setState((s) => ({ ...s, typing: false, entries: [...s.entries, b] }));
      await wait(BUBBLE_DELAY);
    }
  }, []);

  const emitIntroForNode = useCallback(
    async (node: QuestionNode, data: PatientData) => {
      const bubbles: ChatEntry[] = node.intro.map((t) => ({
        id: nextId(),
        role: 'bot',
        kind: 'text',
        text: t,
      }));

      // Node-specific pre-cards (severity monitor for certain nodes)
      if (['pain-description', 'symptoms', 'origination'].includes(node.id)) {
        const sv = computeSeverity(data);
        if (sv.total > 0) {
          bubbles.push({ id: nextId(), role: 'bot', kind: 'severity', severity: sv });
        }
      }

      // For chips nodes, append a chips-question bubble so the options appear
      // inline as part of the conversation instead of in the footer.
      if ((node.kind === 'chips-single' || node.kind === 'chips-multi') && node.options) {
        bubbles.push({
          id: nextId(),
          role: 'bot',
          kind: 'chips-question',
          prompt: node.prompt,
          options: node.options,
          multi: node.kind === 'chips-multi',
        });
      }

      await emitBubbles(bubbles);
    },
    [emitBubbles],
  );

  // ── Advance flow ────────────────────────────────────────────────
  const advanceTo = useCallback(
    async (nextNodeId: string | null, dataAtAdvance: PatientData) => {
      if (!nextNodeId) return;
      const node = getNode(nextNodeId);
      if (!node) return;

      setState((s) => ({ ...s, currentId: nextNodeId }));

      if (node.kind === 'processing') {
        await emitIntroForNode(node, dataAtAdvance);
        // Run engine with simulated processing delay
        await wait(1400);
        const out = runEngine(dataAtAdvance);
        setState((s) => ({
          ...s,
          result: out,
          entries: [...s.entries, { id: nextIdStr(), role: 'bot', kind: 'result', result: out }],
          currentId: 'results',
        }));
        return;
      }

      if (node.kind === 'results') {
        // Nothing else — the result card was already emitted by processing.
        return;
      }

      await emitIntroForNode(node, dataAtAdvance);
    },
    [emitIntroForNode],
  );

  // Helper to generate bot/user ids outside React state (keeps renders pure).
  const nextIdStr = (): string => nextId();

  // ── User answer commit ──────────────────────────────────────────
  const commit = useCallback(
    async (label: string, patch: Partial<PatientData>, fromFollowup = false) => {
      // ENGINE-BUG-6 fix: Compute newData SYNCHRONOUSLY before queuing the
      // setState callback. The previous "let newData; setState(s => { newData
      // = ...; })" pattern relied on React running the setState reducer
      // synchronously inside the dispatch — which is true for legacy unstable
      // batches but NOT for React 18 automatic batching, where the reducer
      // runs deferred. The aggravator/relief/past-treatment branches then
      // computed `node.next(newData)` against a STALE empty patient object,
      // and the engine silently skipped L190202 / L210102 / L230102 — a
      // clinical bug that violated spec Annex A rules 6/8/10.
      // Compute newData up front; React 18 will reconcile the same reference.
      const newData: PatientData = { ...state.data, ...patch };
      // Derive BMI if height & weight now both present.
      if ((patch.height !== undefined || patch.weight !== undefined) && newData.height && newData.weight) {
        const hm = parseFloat(newData.height) / 100;
        if (hm > 0) {
          const w = parseFloat(newData.weight);
          newData.bmi = Math.round((w / (hm * hm)) * 10) / 10;
        }
      }
      // Push history snapshot BEFORE applying the patch so edit_previous
      // can revert to the pre-commit state. v4.4 spec Part I.2 mandate 1.
      setState((s) => ({
        ...s,
        data: newData,
        history: [...s.history, { nodeId: s.currentId, data: s.data }],
        entries: [...s.entries, { id: nextIdStr(), role: 'user', kind: 'text', text: label }],
      }));

      // 2. If this commit came from a follow-up, handle the next follow-up (if any) OR fall through
      if (fromFollowup) {
        await handleFollowupChain(newData);
        return;
      }

      // 3. Post-node side effects for the CURRENT question node
      const node = getNode(state.currentId);
      if (!node) return;

      const sideEffects: ChatEntry[] = [];

      // Height/weight — show heightInsight + BMI insight
      if (node.id === 'height-weight' && newData.height && newData.L010401) {
        const h = parseFloat(newData.height);
        if (!Number.isNaN(h)) {
          sideEffects.push({
            id: nextIdStr(),
            role: 'bot',
            kind: 'insight',
            emoji: '📏',
            color: '#22d3ee',
            text: heightInsight(h, newData.L010401),
          });
        }
      }
      if (node.id === 'height-weight' && newData.bmi) {
        sideEffects.push({
          id: nextIdStr(),
          role: 'bot',
          kind: 'bmi',
          bmi: newData.bmi,
          insight: bmiInsight(newData.bmi),
        });
      }

      // Mini-diagnosis after activity selection
      if (node.id === 'pain-activity') {
        const mi = findActivityInsight(newData.L030701);
        if (mi) {
          sideEffects.push({
            id: nextIdStr(),
            role: 'bot',
            kind: 'mini-diagnosis',
            insight: mi,
          });
        }
      }

      // Red-flag alerts on bowel/bladder symptoms
      if (node.id === 'symptoms' && (newData.L030801 ?? []).some((x) => x.includes('bowel'))) {
        sideEffects.push({
          id: nextIdStr(),
          role: 'bot',
          kind: 'red-flag',
          text: 'Bowel/bladder dysfunction is a serious red flag indicator requiring urgent attention.',
        });
      }

      // Generic postBubbles configured on the node
      if (node.postBubbles) {
        for (const b of node.postBubbles(newData)) {
          sideEffects.push({
            id: nextIdStr(),
            role: 'bot',
            kind: 'insight',
            emoji: b.emoji,
            text: b.text,
            color: b.color,
          });
        }
      }

      // Live severity after trend update and later points
      if (['pain-activity', 'trend'].includes(node.id)) {
        const sv = computeSeverity(newData);
        if (sv.total > 0) {
          sideEffects.push({ id: nextIdStr(), role: 'bot', kind: 'severity', severity: sv });
        }
      }

      if (sideEffects.length > 0) {
        await emitBubbles(sideEffects);
      }

      // 4. Medical history — queue follow-ups if needed
      if (node.id === 'medical-conditions') {
        const flagged = (newData.L031001 ?? []).filter((c) => c !== 'None' && MED_FOLLOWUPS[c]);
        if (flagged.length > 0) {
          setState((s) => ({ ...s, pendingFollowups: flagged }));
          await handleFollowupChain(newData);
          return;
        }
      }

      // 5. Advance to the IMMEDIATE next node the branching function returns.
      //
      // Do NOT walk findNextUnansweredFrom here: in the chip-commit path the
      // user is actively in the structured flow and every branch sub-question
      // (e.g. relief → relief-duration, surgery → surgery-recent, past-
      // treatment → past-treatment-outcome) must be asked so the user can
      // answer or adjust it. Silent skip-ahead caused the user to tap a
      // reducing activity and never be asked "how long until it reduces",
      // because a prior LLM extraction had populated L210102.
      //
      // findNextUnansweredFrom is still used on the extraction-confirmation
      // path where it is correct — extraction can legitimately pre-fill many
      // future fields and the user expects those questions to be skipped.
      const immediateNext = node.next(newData);
      if (immediateNext) {
        await advanceTo(immediateNext, newData);
      }
    },
    [advanceTo, emitBubbles, state.currentId, state.data],
  );

  const handleFollowupChain = useCallback(
    async (dataRef: PatientData) => {
      // Take the first pending follow-up and emit it
      let nextFu: string | null = null;
      let rest: string[] = [];
      setState((s) => {
        if (s.pendingFollowups.length === 0) {
          nextFu = null;
          return s;
        }
        nextFu = s.pendingFollowups[0] ?? null;
        rest = s.pendingFollowups.slice(1);
        return { ...s, activeFollowup: nextFu, pendingFollowups: rest };
      });

      if (!nextFu) {
        // Follow-ups done — advance from medical-conditions
        setState((s) => ({ ...s, activeFollowup: null }));
        const base = getNode('medical-conditions');
        if (base) await advanceTo(base.next(dataRef), dataRef);
        return;
      }

      const fu = MED_FOLLOWUPS[nextFu];
      if (!fu) return;

      await emitBubbles([
        { id: nextIdStr(), role: 'bot', kind: 'text', text: `About "${nextFu}" — ${fu.q}` },
        {
          id: nextIdStr(),
          role: 'bot',
          kind: 'chips-question',
          prompt: nextFu,
          options: fu.o,
          multi: false,
        },
      ]);
    },
    [advanceTo, emitBubbles],
  );

  // ── Input handlers ──────────────────────────────────────────────
  const node = useMemo(() => getNode(state.currentId), [state.currentId]);
  const isFollowupActive = state.activeFollowup !== null;

  const handleSelect = useCallback(
    (value: string) => {
      if (isFollowupActive && state.activeFollowup) {
        const key = `FU_${state.activeFollowup}` as const;
        void commit(value, { [key]: value } as Partial<PatientData>, true);
        return;
      }
      if (!node?.field) return;
      // "Skip" on optional secondary region — store empty and advance
      if (node.id === 'region-secondary' && value === 'Skip') {
        void commit('Skip', { L030201b: undefined });
        return;
      }
      void commit(value, { [node.field]: value } as Partial<PatientData>);
    },
    [commit, isFollowupActive, node, state.activeFollowup],
  );

  const handleSelectMulti = useCallback(
    (values: string[]) => {
      if (!node?.field) return;
      const label = values.join(', ') || 'None selected';
      void commit(label, { [node.field]: values } as unknown as Partial<PatientData>);
    },
    [commit, node],
  );

  // Chip answer handlers: mark the in-transcript chips-question bubble as resolved
  // (so the buttons disable and render the user's choice), then delegate to the
  // existing single/multi commit paths.
  const handleChipsAnswer = useCallback(
    (entryId: string, value: string) => {
      setState((s) => ({
        ...s,
        entries: s.entries.map((en) =>
          en.id === entryId && en.role === 'bot' && en.kind === 'chips-question'
            ? { ...en, resolved: value }
            : en,
        ),
      }));
      handleSelect(value);
    },
    [handleSelect],
  );

  const handleChipsAnswerMulti = useCallback(
    (entryId: string, values: string[]) => {
      setState((s) => ({
        ...s,
        entries: s.entries.map((en) =>
          en.id === entryId && en.role === 'bot' && en.kind === 'chips-question'
            ? { ...en, resolved: values }
            : en,
        ),
      }));
      handleSelectMulti(values);
    },
    [handleSelectMulti],
  );

  const handleSubmit = useCallback(
    (value: string) => {
      if (!node?.field) return;
      void commit(value, { [node.field]: value } as Partial<PatientData>);
    },
    [commit, node],
  );

  const handleSubmitHeightWeight = useCallback(
    (h: string, w: string) => {
      void commit(`${h} cm, ${w} kg`, { height: h, weight: w });
    },
    [commit],
  );

  const handleSubmitRange = useCallback(
    (value: number) => {
      if (!node?.field) return;
      void commit(`${value}/10`, { [node.field]: value } as unknown as Partial<PatientData>);
    },
    [commit, node],
  );

  const handleAdvance = useCallback(() => {
    if (!node) return;
    void advanceTo(node.next(state.data), state.data);
  }, [advanceTo, node, state.data]);

  // ── Free-text → /api/extract → confirmation card ────────────────
  const handleFreeText = useCallback(
    async (text: string) => {
      if (state.awaitingExtraction) return;

      // 1. Echo the user's free-text as a user bubble
      const userEntryId = nextIdStr();
      setState((s) => ({
        ...s,
        entries: [...s.entries, { id: userEntryId, role: 'user', kind: 'text', text }],
      }));

      // 2. Emit a "thinking" bubble while we wait for the LLM
      const thinkingId = nextIdStr();
      setState((s) => ({
        ...s,
        typing: true,
      }));
      await wait(TYPING_DELAY);
      setState((s) => ({
        ...s,
        typing: false,
        entries: [
          ...s.entries,
          { id: thinkingId, role: 'bot', kind: 'thinking', text: 'Understanding your description…' },
        ],
      }));

      // 3. Call the extraction API
      let resp: ExtractResponse;
      try {
        const req: ExtractRequest = {
          text,
          nodeId: state.currentId,
          data: state.data,
        };
        const r = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req),
        });
        resp = (await r.json()) as ExtractResponse;
      } catch (e) {
        resp = {
          success: false,
          patches: {},
          labels: {},
          error: `Network error: ${(e as Error).message}`,
        };
      }

      // 4. Remove the thinking bubble
      setState((s) => ({
        ...s,
        entries: s.entries.filter((en) => en.id !== thinkingId),
      }));

      // 5. If the API failed, emit an apology bubble and leave input free
      if (!resp.success) {
        await emitBubbles([
          {
            id: nextIdStr(),
            role: 'bot',
            kind: 'text',
            text: `I couldn't process that right now (${resp.error ?? 'unknown error'}). Please use the options above, or try again.`,
          },
        ]);
        return;
      }

      // 5b. v4.4 spec Part I.2 mandate 1 — meta-request handling. Flow-control
      // intents (edit/clarify/repeat/skip/end) take precedence over patches.
      // The dispatch is inlined here (rather than a separate helper) to avoid
      // adding another useCallback that would need to be threaded through deps.
      if (resp.metaRequest) {
        const kind = resp.metaRequest.kind;
        const cur = getNode(state.currentId);
        const fuLabel = state.activeFollowup;
        const isCritical =
          CRITICAL_NODES.has(state.currentId) ||
          (fuLabel ? CRITICAL_FOLLOWUPS.has(fuLabel) : false);
        const skipKey = fuLabel ? 'FU:' + fuLabel : state.currentId;

        if (kind === 'edit_previous') {
          if (state.history.length === 0) {
            await emitBubbles([
              {
                id: nextIdStr(),
                role: 'bot',
                kind: 'text',
                text: "There's nothing to revert yet — this is the first question.",
              },
            ]);
            return;
          }
          const prev = state.history[state.history.length - 1];
          setState((s) => ({
            ...s,
            currentId: prev.nodeId,
            data: prev.data,
            history: s.history.slice(0, -1),
            awaitingExtraction: null,
          }));
          await emitBubbles([
            {
              id: nextIdStr(),
              role: 'bot',
              kind: 'text',
              text: 'Going back one step. You can answer that question again — your new response will overwrite the previous one.',
            },
          ]);
          const prevNode = getNode(prev.nodeId);
          if (prevNode) await emitIntroForNode(prevNode, prev.data);
          return;
        }

        if (kind === 'repeat') {
          if (cur) await emitIntroForNode(cur, state.data);
          return;
        }

        if (kind === 'clarify') {
          // Spec Part I.2 mandate 1: "Re-phrase the question using the pre-scripted
          // clarification bank (clinician-supplied), or explain the medical term in
          // layman language." The clarification bank is owned by the clinical team
          // and is currently a placeholder — we re-phrase generically and re-emit
          // the question so the user can answer.
          await emitBubbles([
            {
              id: nextIdStr(),
              role: 'bot',
              kind: 'text',
              text: "No problem — let me put it differently. I'm trying to understand more about your situation; tap one of the options below that fits best, or tell me more in your own words and I'll match it up.",
            },
          ]);
          if (cur) await emitIntroForNode(cur, state.data);
          return;
        }

        if (kind === 'skip') {
          const count = (state.skipCounts[skipKey] ?? 0) + 1;
          if (isCritical && count === 1) {
            setState((s) => ({ ...s, skipCounts: { ...s.skipCounts, [skipKey]: count } }));
            await emitBubbles([
              {
                id: nextIdStr(),
                role: 'bot',
                kind: 'text',
                text: 'I hear you. This particular question is one of the few that helps me understand whether you need urgent review — could you take another look and pick whichever option fits best?',
              },
            ]);
            if (cur) await emitIntroForNode(cur, state.data);
            return;
          }
          if (isCritical && count >= 2) {
            setState((s) => ({
              ...s,
              skipCounts: { ...s.skipCounts, [skipKey]: count },
              ended: true,
            }));
            await emitBubbles([
              {
                id: nextIdStr(),
                role: 'bot',
                kind: 'text',
                text: "That's okay — because you'd rather not answer this one and it's an important safety question, the safest path is to pause the assessment here and have you speak with a clinician directly. Please book a consultation with your physician or use the urgent-care pathway in your region.",
              },
            ]);
            return;
          }
          // Non-critical skip — record decline and advance.
          setState((s) => ({ ...s, skipCounts: { ...s.skipCounts, [skipKey]: count } }));
          await emitBubbles([
            {
              id: nextIdStr(),
              role: 'bot',
              kind: 'text',
              text: 'Skipped — noted. Moving on.',
            },
          ]);
          if (cur && cur.next) {
            const nxt = cur.next(state.data);
            if (nxt) await advanceTo(nxt, state.data);
          }
          return;
        }

        if (kind === 'end_session') {
          const hasRegion =
            !!state.data.L030201 && state.data.L030201 !== 'No pain';
          const hasScale = typeof state.data.L030501 === 'number';
          if (hasRegion && hasScale) {
            await emitBubbles([
              {
                id: nextIdStr(),
                role: 'bot',
                kind: 'text',
                text: "Got it — wrapping up early with a partial summary. I'll only show what we have so far; for a complete risk indication, please come back and finish the questionnaire.",
              },
            ]);
            const out = runEngine(state.data);
            setState((s) => ({
              ...s,
              ended: true,
              result: out,
              currentId: 'results',
              entries: [
                ...s.entries,
                { id: nextIdStr(), role: 'bot', kind: 'result', result: out },
              ],
            }));
          } else {
            setState((s) => ({ ...s, ended: true }));
            await emitBubbles([
              {
                id: nextIdStr(),
                role: 'bot',
                kind: 'text',
                text: "Pausing the session here. I don't have enough information yet to give a meaningful risk indication, so come back any time and pick up where we left off — your answers so far are saved in this conversation.",
              },
            ]);
          }
          return;
        }
      }

      // 6. Build extraction-summary entry
      const labelList = Object.entries(resp.labels).map(([key, label]) => ({ key, label }));
      const summaryId = nextIdStr();
      await emitBubbles([
        {
          id: summaryId,
          role: 'bot',
          kind: 'extraction-summary',
          labels: labelList,
          patches: resp.patches,
          notes: resp.notes,
        },
      ]);

      // If nothing was captured, don't block the input — let the user keep going.
      if (labelList.length === 0) {
        return;
      }

      // 7. Disable the input until the user confirms or edits
      setState((s) => ({ ...s, awaitingExtraction: summaryId }));
    },
    [emitBubbles, state.awaitingExtraction, state.currentId, state.data],
  );

  const handleConfirmExtraction = useCallback(
    async (entryId: string) => {
      // Find the summary entry
      const entry = state.entries.find(
        (en) => en.id === entryId && en.role === 'bot' && en.kind === 'extraction-summary',
      );
      if (!entry || entry.role !== 'bot' || entry.kind !== 'extraction-summary') return;
      if (entry.resolved) return;

      const patches = entry.patches;

      // Determine whether the CURRENT node's field was extracted — if so,
      // its chips-question bubble (if any) should be marked resolved.
      const currentNode = getNode(state.currentId);
      const currentFieldFilled = !!(currentNode?.field && currentNode.field in patches);
      const currentFieldValue =
        currentNode?.field && currentFieldFilled
          ? (patches as Record<string, unknown>)[currentNode.field]
          : undefined;

      // Apply patches to data, re-deriving BMI if height/weight changed
      let newData: PatientData = state.data;
      setState((s) => {
        newData = { ...s.data, ...patches } as PatientData;
        if (newData.height && newData.weight) {
          const hm = parseFloat(newData.height) / 100;
          if (hm > 0) {
            const w = parseFloat(newData.weight);
            newData.bmi = Math.round((w / (hm * hm)) * 10) / 10;
          }
        }
        // Locate the most recent unresolved chips-question — that's the
        // current node's input bubble. If the current field was filled by
        // the extraction patches, mark it resolved so the UI stops showing
        // it as open.
        let lastOpenChipsIdx = -1;
        if (currentFieldFilled) {
          for (let i = s.entries.length - 1; i >= 0; i -= 1) {
            const en = s.entries[i];
            if (en && en.role === 'bot' && en.kind === 'chips-question' && !en.resolved) {
              lastOpenChipsIdx = i;
              break;
            }
          }
        }
        return {
          ...s,
          data: newData,
          awaitingExtraction: null,
          entries: s.entries.map((en, idx) => {
            if (en.id === entryId && en.role === 'bot' && en.kind === 'extraction-summary') {
              return { ...en, resolved: 'confirmed' as const };
            }
            if (
              idx === lastOpenChipsIdx &&
              en.role === 'bot' &&
              en.kind === 'chips-question'
            ) {
              return { ...en, resolved: currentFieldValue as string | string[] };
            }
            return en;
          }),
        };
      });

      // Emit a short confirmation bubble
      await emitBubbles([
        {
          id: nextIdStr(),
          role: 'bot',
          kind: 'text',
          text: `Got it — I've saved those answers. Let's continue.`,
        },
      ]);

      // If medical conditions were patched with follow-up-eligible values, queue them
      if ('L031001' in patches) {
        const flagged = (newData.L031001 ?? []).filter((c) => c !== 'None' && MED_FOLLOWUPS[c]);
        if (flagged.length > 0) {
          setState((s) => ({ ...s, pendingFollowups: flagged }));
          await handleFollowupChain(newData);
          return;
        }
      }

      // Advance to the first unanswered node. If the current field was
      // filled by extraction, skip forward from the current node's next;
      // otherwise stay on the current node but tell the user we still
      // need that specific answer.
      if (currentFieldFilled && currentNode) {
        const immediateNext = currentNode.next(newData);
        if (immediateNext) {
          const skipToId = findNextUnansweredFrom(immediateNext, newData);
          await advanceTo(skipToId, newData);
        }
      } else if (currentNode) {
        // The current question wasn't answered by the free text — walk
        // forward past any fields that WERE filled (in case extraction
        // covered later nodes) to land on the earliest still-unanswered
        // node, which may still be the current one.
        const skipToId = findNextUnansweredFrom(state.currentId, newData);
        if (skipToId === state.currentId) {
          // The earlier chips-question bubble (if any) is now scrolled up
          // and the footer only renders the free-text bar for chips kinds —
          // so the user has no visible options to tap. Re-emit a fresh
          // chips-question bubble at the bottom of the transcript so the
          // user can pick an answer. Same pattern for a non-chips node:
          // remind them via text and keep the structured footer input.
          const needText: ChatEntry = {
            id: nextIdStr(),
            role: 'bot',
            kind: 'text',
            text: `I still need an answer for this — please pick an option below.`,
          };
          const bubbles: ChatEntry[] = [needText];
          if (
            (currentNode.kind === 'chips-single' || currentNode.kind === 'chips-multi') &&
            currentNode.options
          ) {
            bubbles.push({
              id: nextIdStr(),
              role: 'bot',
              kind: 'chips-question',
              prompt: currentNode.prompt,
              options: currentNode.options,
              multi: currentNode.kind === 'chips-multi',
            });
          }
          await emitBubbles(bubbles);
        } else {
          await advanceTo(skipToId, newData);
        }
      }
    },
    [advanceTo, emitBubbles, handleFollowupChain, state.currentId, state.data, state.entries],
  );

  const handleEditExtraction = useCallback(
    async (entryId: string) => {
      setState((s) => ({
        ...s,
        awaitingExtraction: null,
        entries: s.entries.map((en) =>
          en.id === entryId && en.role === 'bot' && en.kind === 'extraction-summary'
            ? { ...en, resolved: 'edited' as const }
            : en,
        ),
      }));
      await emitBubbles([
        {
          id: nextIdStr(),
          role: 'bot',
          kind: 'text',
          text: 'No problem — please answer using the options above.',
        },
      ]);
    },
    [emitBubbles],
  );

  const handleRestart = useCallback(() => {
    entryCounter = 0;
    const restartData: PatientData = { L030501: 5, ...(initialData ?? {}) };
    setState({
      currentId: 'welcome',
      data: restartData,
      entries: [],
      typing: false,
      pendingFollowups: [],
      activeFollowup: null,
      result: null,
      awaitingExtraction: null,
      history: [],
      skipCounts: {},
      ended: false,
    });
    // Re-emit welcome on next tick
    setTimeout(() => {
      const w = getNode('welcome');
      if (w) void emitIntroForNode(w, restartData);
    }, 50);
  }, [emitIntroForNode, initialData]);

  // ── Initial mount: emit welcome ────────────────────────────────
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    const w = getNode('welcome');
    if (w) void emitIntroForNode(w, state.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived UI props ───────────────────────────────────────────
  const inputKind = isFollowupActive ? 'chips-single' : node?.kind ?? 'info';
  const inputPrompt = isFollowupActive
    ? state.activeFollowup ?? ''
    : node?.prompt;

  const region = regionFromPrimary(state.data.L030201) ?? 'back';
  const regionCount = DB[region]?.length ?? 0;

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(20,184,166,0.12) 0%, transparent 60%), #020617',
        display: 'flex',
        justifyContent: 'center',
        padding: 16,
        boxSizing: 'border-box',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 24,
          boxShadow:
            '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          display: 'flex',
          flexDirection: 'column',
          height: '95vh',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background:
              'linear-gradient(180deg, rgba(20,184,166,0.08) 0%, transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {onExit && (
              <button
                type="button"
                onClick={onExit}
                aria-label="Back to scan menu"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#cbd5e1',
                  borderRadius: 8,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ←
              </button>
            )}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background:
                  'linear-gradient(135deg, rgba(20,184,166,0.20) 0%, rgba(20,184,166,0.06) 100%)',
                border: '1px solid rgba(20,184,166,0.30)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow:
                  '0 4px 12px rgba(20,184,166,0.25), inset 0 1px 0 rgba(255,255,255,0.10)',
              }}
            >
              <svg
                viewBox="0 0 100 100"
                style={{
                  width: 22,
                  height: 22,
                  filter: 'drop-shadow(0 0 6px rgba(20,184,166,0.7))',
                }}
              >
                <defs>
                  <linearGradient id="kriya-logo" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2dd4bf" />
                    <stop offset="100%" stopColor="#14b8a6" />
                  </linearGradient>
                </defs>
                <path
                  d="M25 50 C25 35,40 35,50 50 C60 65,75 65,75 50 C75 35,60 35,50 50 C40 65,25 65,25 50"
                  fill="none"
                  stroke="url(#kriya-logo)"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
                <circle cx="50" cy="50" r="4" fill="#2dd4bf" />
              </svg>
            </div>
            <div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: '#f8fafc',
                  lineHeight: 1,
                  letterSpacing: '-0.01em',
                }}
              >
                Kriya
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#14b8a6',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginTop: 4,
                }}
              >
                Pain Diagnostics
              </div>
            </div>
          </div>
          {state.currentId === 'processing' && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
              }}
            >
              Evaluating {regionCount}+ conditions
            </span>
          )}
        </div>

        {/* Transcript */}
        <ChatTranscript
          entries={state.entries}
          typing={state.typing}
          onConfirmExtraction={(id) => void handleConfirmExtraction(id)}
          onEditExtraction={(id) => void handleEditExtraction(id)}
          onChipsAnswer={handleChipsAnswer}
          onChipsAnswerMulti={handleChipsAnswerMulti}
        />

        {/* Input */}
        <ChatInput
          kind={inputKind}
          prompt={inputPrompt}
          onSubmit={handleSubmit}
          onSubmitHeightWeight={handleSubmitHeightWeight}
          onSubmitRange={handleSubmitRange}
          onSubmitFreeText={(t) => void handleFreeText(t)}
          onAdvance={handleAdvance}
          onRestart={handleRestart}
          disabled={state.awaitingExtraction !== null || state.ended}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Walk the canonical flow from `welcome` using each node's `next(data)`
 * branching function. Returns the id of the first node whose `field`
 * is not yet populated in `data`. `info`, `processing`, `results`, and
 * field-less nodes are treated as pass-through. If the walk reaches the
 * end without finding an unanswered field, returns `processing` so the
 * engine can run.
 *
 * A safety cap of 100 hops prevents infinite loops if branching misbehaves.
 */
function findNextUnanswered(data: PatientData): string {
  let currentId: string | null = 'welcome';
  let hops = 0;
  while (currentId && hops < 100) {
    hops += 1;
    const n = getNode(currentId);
    if (!n) break;
    if (n.kind === 'processing' || n.kind === 'results') return currentId;

    if (n.field) {
      const v = (data as Record<string, unknown>)[n.field];
      const isEmpty =
        v === undefined ||
        v === null ||
        v === '' ||
        (Array.isArray(v) && v.length === 0);
      if (isEmpty) return currentId;
    }

    currentId = n.next(data);
  }
  return 'processing';
}

/**
 * Walk the flow starting at `startId`, skipping any nodes whose `field` is
 * already populated in `data`. Returns the first node that still needs
 * input (or `processing` if the walk completes). Used by `commit` so that
 * after a chip tap, we advance past any later nodes whose fields were
 * already filled by a prior LLM extraction.
 */
function findNextUnansweredFrom(startId: string, data: PatientData): string {
  let currentId: string | null = startId;
  let hops = 0;
  while (currentId && hops < 100) {
    hops += 1;
    const n = getNode(currentId);
    if (!n) break;
    if (n.kind === 'processing' || n.kind === 'results') return currentId;
    if (n.field) {
      const v = (data as Record<string, unknown>)[n.field];
      const isEmpty =
        v === undefined ||
        v === null ||
        v === '' ||
        (Array.isArray(v) && v.length === 0);
      if (isEmpty) return currentId;
      currentId = n.next(data);
      continue;
    }
    return currentId;
  }
  return 'processing';
}

function runEngine(d: PatientData): EngineOutput {
  return cdeRunEngine(d);
}
   