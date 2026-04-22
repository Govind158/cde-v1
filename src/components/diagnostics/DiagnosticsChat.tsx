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
import { mapRegion, scoreAll, severity } from './scoring';
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
}

const TYPING_DELAY = 450;
const BUBBLE_DELAY = 180;

let entryCounter = 0;
const nextId = (): string => {
  entryCounter += 1;
  return `e${entryCounter}`;
};

export default function DiagnosticsChat() {
  const [state, setState] = useState<OrchestratorState>({
    currentId: 'welcome',
    data: { L030501: 5 },
    entries: [],
    typing: false,
    pendingFollowups: [],
    activeFollowup: null,
    result: null,
    awaitingExtraction: null,
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
        const sv = severity(data);
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
      // 1. Echo user bubble + apply patch + extra post-bubbles
      let newData: PatientData = state.data;
      setState((s) => {
        newData = { ...s.data, ...patch };
        // Derive BMI if height & weight now both present
        if ((patch.height !== undefined || patch.weight !== undefined) && newData.height && newData.weight) {
          const hm = parseFloat(newData.height) / 100;
          if (hm > 0) {
            const w = parseFloat(newData.weight);
            newData.bmi = Math.round((w / (hm * hm)) * 10) / 10;
          }
        }
        return {
          ...s,
          data: newData,
          entries: [...s.entries, { id: nextIdStr(), role: 'user', kind: 'text', text: label }],
        };
      });

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
        const sv = severity(newData);
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
          await emitBubbles([
            {
              id: nextIdStr(),
              role: 'bot',
              kind: 'text',
              text: `I still need an answer for the question above — please pick an option.`,
            },
          ]);
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
    setState({
      currentId: 'welcome',
      data: { L030501: 5 },
      entries: [],
      typing: false,
      pendingFollowups: [],
      activeFollowup: null,
      result: null,
      awaitingExtraction: null,
    });
    // Re-emit welcome on next tick
    setTimeout(() => {
      const w = getNode('welcome');
      if (w) void emitIntroForNode(w, { L030501: 5 });
    }, 50);
  }, [emitIntroForNode]);

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

  const region = mapRegion(state.data.L030201);
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
          disabled={state.awaitingExtraction !== null}
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
      // Field already populated — skip forward
      currentId = n.next(data);
      continue;
    }

    // Field-less node (info, welcome) — stop here so intro/Begin can play
    return currentId;
  }
  return 'processing';
}

function runEngine(d: PatientData): EngineOutput {
  // "No pain" path
  if (d.L030201 === 'No pain') {
    const out: NoPainResult = {
      noPain: true,
      action:
        'Our pain algorithm is designed to assist care-seekers under pain. Since you are not having any pain, we encourage you to undertake an evaluation of your muscle health to check the Age of your Muscles.',
    };
    return out;
  }

  const region = mapRegion(d.L030201);
  const sv = severity(d);
  const scores = scoreAll(region, d);
  const top3 = scores.slice(0, 3);

  const diff = scores.length >= 2 && scores[0] && scores[1] ? scores[0].score - scores[1].score : 10;
  const confidence: DiagnosticResult['confidence'] =
    diff >= 4 ? 'High' : diff >= 2 ? 'Moderate' : 'Low';

  const sMap: Record<string, number> = {};
  scores.forEach((s) => {
    sMap[s.name] = s.score;
  });

  const action =
    sv.bucket === 'Emergency'
      ? 'Immediate specialist consultation required. Consider emergency care.'
      : sv.bucket === 'Severe'
      ? 'Urgent specialist consultation recommended within 24-48 hours.'
      : sv.bucket === 'Moderate'
      ? 'Schedule specialist consultation within 1-2 weeks.'
      : 'Consider physiotherapy or wellness assessment. Monitor symptoms.';

  const out: DiagnosticResult = {
    user: { age: d.L010301, gender: d.L010401, bmi: d.bmi },
    pain: {
      region: d.L030201,
      duration: d.L150101,
      scale: d.L030501,
      description: d.L030401,
      feeling: d.L030601,
    },
    severity: sv,
    scores: sMap,
    top_3: top3,
    confidence,
    action,
    disclaimer:
      'This is a probabilistic digital triage system and not a final medical diagnosis. Please consult a specialist for confirmation.',
  };
  return out;
}
