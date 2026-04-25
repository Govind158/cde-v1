/**
 * POST /api/extract  (CDE v4.1)
 *
 * Spec Part I.2 mandate — the extractor has THREE bounded responsibilities:
 *
 *   1. Meta-request handling      (flow control: edit_previous, clarify, repeat,
 *                                  skip, end_session)
 *   2. Fuzzy enum mapping         (>0.85 confident → patches; 0.60–0.85 → ambiguous;
 *                                  <0.60 → qualitative or fall-back to chips)
 *   3. Qualitative flagging       (clinically meaningful free text outside the
 *                                  enum is recorded verbatim for the clinician
 *                                  report — never enters scoring)
 *
 * The extractor NEVER evaluates symptoms, ranks conditions, or computes risk.
 * Every patch is shown back to the user for confirmation before merging.
 */

import { NextResponse } from 'next/server';
import {
  EXTRACT_FIELDS,
  type ExtractField,
  type ExtractRequest,
  type ExtractResponse,
  type MetaRequestKind,
} from '@/lib/extract-schema';
import type { PatientData } from '@/components/diagnostics/types';

export const runtime = 'nodejs';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

export async function POST(req: Request): Promise<NextResponse<ExtractResponse>> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { success: false, patches: {}, labels: {}, error: 'OPENAI_API_KEY is not configured on the server.' },
      { status: 500 },
    );
  }

  let body: ExtractRequest;
  try {
    body = (await req.json()) as ExtractRequest;
  } catch {
    return NextResponse.json(
      { success: false, patches: {}, labels: {}, error: 'Invalid JSON body.' },
      { status: 400 },
    );
  }

  const { text, nodeId, data } = body;
  if (!text || !text.trim()) {
    return NextResponse.json(
      { success: false, patches: {}, labels: {}, error: 'Empty text.' },
      { status: 400 },
    );
  }

  // Quick local meta-request detection for the most unambiguous patterns.
  // The LLM also gets a chance to set metaRequest in the structured response.
  const localMeta = detectLocalMetaRequest(text);

  const unansweredFields = EXTRACT_FIELDS.filter((f) => {
    const v = (data as Record<string, unknown>)[f.key];
    return v === undefined || v === null || (Array.isArray(v) && v.length === 0) || v === '';
  });

  const prompt = buildPrompt(text, nodeId, unansweredFields);

  let completion: unknown;
  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: 'json_object' },
        temperature: 0,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { success: false, patches: {}, labels: {}, error: 'OpenAI ' + res.status + ': ' + errText.slice(0, 200) },
        { status: 502 },
      );
    }
    completion = await res.json();
  } catch (e) {
    return NextResponse.json(
      { success: false, patches: {}, labels: {}, error: 'Fetch failed: ' + (e as Error).message },
      { status: 502 },
    );
  }

  const raw = extractContent(completion);
  if (!raw) {
    return NextResponse.json(
      { success: false, patches: {}, labels: {}, error: 'Empty LLM response.' },
      { status: 502 },
    );
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, patches: {}, labels: {}, error: 'LLM returned invalid JSON.' },
      { status: 502 },
    );
  }

  const { patches, labels } = validatePatches(parsed, unansweredFields);
  const notes = typeof parsed.notes === 'string' ? parsed.notes : undefined;

  // Spec Part I.2 mandate 1 — meta-requests (LLM may set this; local heuristic also runs).
  let metaRequest: { kind: MetaRequestKind; nodeId?: string } | undefined;
  if (localMeta) {
    metaRequest = { kind: localMeta, nodeId };
  } else if (typeof parsed.metaRequest === 'object' && parsed.metaRequest !== null) {
    const m = parsed.metaRequest as { kind?: string };
    if (
      m.kind === 'edit_previous' ||
      m.kind === 'clarify' ||
      m.kind === 'repeat' ||
      m.kind === 'skip' ||
      m.kind === 'end_session'
    ) {
      metaRequest = { kind: m.kind, nodeId };
    }
  }

  // Spec Part I.2 mandate 3 — qualitative observations (verbatim, no scoring).
  let qualitative: ExtractResponse['qualitative'];
  if (Array.isArray(parsed.qualitative)) {
    qualitative = (parsed.qualitative as Array<unknown>)
      .filter((q): q is { text: string; qcContext?: string } => typeof q === 'object' && q !== null && typeof (q as { text?: unknown }).text === 'string')
      .map((q) => ({ text: q.text.slice(0, 500), qcContext: typeof q.qcContext === 'string' ? q.qcContext : nodeId }));
    if (qualitative.length === 0) qualitative = undefined;
  }

  // Spec Part I.2 mandate 2 — moderate-confidence ambiguity (0.60–0.85): present 2 closest.
  let ambiguous: ExtractResponse['ambiguous'];
  if (Array.isArray(parsed.ambiguous)) {
    ambiguous = (parsed.ambiguous as Array<unknown>)
      .filter((a): a is { qc: string; choices: string[] } =>
        typeof a === 'object' && a !== null &&
        typeof (a as { qc?: unknown }).qc === 'string' &&
        Array.isArray((a as { choices?: unknown }).choices),
      )
      .map((a) => ({ qc: a.qc, choices: a.choices.filter((c): c is string => typeof c === 'string').slice(0, 2) }));
    if (ambiguous.length === 0) ambiguous = undefined;
  }

  return NextResponse.json({ success: true, patches, labels, notes, metaRequest, qualitative, ambiguous });
}

// ─────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a strict EXTRACTION + META-REQUEST function for the Kriya Pain Risk Assessment.
Your job is bounded by THREE mandates and nothing else.

MANDATE 1 — Meta-request handling (flow control, never scoring).
If the user is not answering the current question but is asking to do something with the flow itself, set "metaRequest" with kind ∈ {edit_previous, clarify, repeat, skip, end_session}. Do NOT also fill any field for that turn.

MANDATE 2 — Fuzzy mapping with confidence tiers.
For a free-text answer to the active question:
  - High confidence (>0.85 alignment): put the verbatim option string into "patches".
  - Moderate (0.60–0.85): instead of patches, put {"qc": "<key>", "choices": ["<top1>", "<top2>"]} into "ambiguous".
  - Low (<0.60): do NOT guess. Either omit or put it under "qualitative".

MANDATE 3 — Qualitative flagging.
If the user gives clinically meaningful information that does NOT map to any chip option (a symptom outside the enum, an anatomical site not in L030201, a related observation), record the verbatim phrase under "qualitative" as {"qcContext": "<active node>", "text": "<verbatim>"}.

ABSOLUTE RULES (any violation = failure):
1. Return ONE valid JSON object. No prose, no markdown, no code fences.
2. Every value in "patches" for an enum field MUST be copied verbatim from the field's options list. Never paraphrase.
3. You do NOT diagnose, evaluate severity, rank conditions, or produce ANY clinical interpretation. Pure translation only.
4. Numeric fields: integers only. Height in cm, weight in kg, age in years.
5. Multi-select fields: array of verbatim option strings.
6. Use "notes" (≤120 chars) to summarise what was captured / skipped.
7. Field hints are AUTHORITATIVE — follow each hint exactly.
8. Never assign a single phrase to two different fields. "Comes and goes" = L030601 Intermittent ONLY (not L030401).
9. Prefer omission to guessing. A note "not enough info for <field>" is better than a wrong patch.
10. Only set negative chips ("No pain" / "Pain doesn't increase" / "Pain doesn't reduce" / "Pain doesn't aggravate") when the user EXPLICITLY says the absence.
11. CRITICAL questions (any neuro symptom, bowel/bladder, fever, night pain) — when the user tries to skip, mirror the clarify mandate: put {"kind": "clarify"} in metaRequest with a notes line explaining the question is critical.`;

function buildPrompt(userText: string, nodeId: string, fields: ExtractField[]): string {
  const fieldBlock = fields
    .map((f) => {
      const opts = f.enum ? '\n  options: ' + JSON.stringify(f.enum) : '';
      const hint = f.hint ? '\n  hint: ' + f.hint : '';
      return '- ' + f.key + ' (' + f.kind + ') — ' + f.label + opts + hint;
    })
    .join('\n');

  return 'Current active question node: ' + nodeId + '\n' +
    'The user\'s free-text message is below.\n\n' +
    'Fields available to populate:\n' + fieldBlock + '\n\n' +
    'User message:\n"""\n' + userText + '\n"""\n\n' +
    'Return JSON with this shape (omit keys you have nothing for):\n' +
    '{\n' +
    '  "<field_key>": <value or array>,\n' +
    '  "notes": "short sentence",\n' +
    '  "metaRequest": {"kind": "edit_previous"|"clarify"|"repeat"|"skip"|"end_session"},\n' +
    '  "qualitative": [{"qcContext": "...", "text": "verbatim user phrase"}],\n' +
    '  "ambiguous": [{"qc": "L030201", "choices": ["Lower back", "Hips"]}]\n' +
    '}';
}

function extractContent(completion: unknown): string | undefined {
  if (typeof completion !== 'object' || completion === null) return undefined;
  const c = completion as { choices?: Array<{ message?: { content?: string } }> };
  return c.choices?.[0]?.message?.content;
}

function validatePatches(
  parsed: Record<string, unknown>,
  fields: ExtractField[],
): { patches: Partial<PatientData> & { height?: string; weight?: string }; labels: Record<string, string> } {
  const patches: Record<string, unknown> = {};
  const labels: Record<string, string> = {};

  for (const f of fields) {
    if (!(f.key in parsed)) continue;
    const raw = parsed[f.key];
    if (raw === null || raw === undefined) continue;

    if (f.kind === 'enum') {
      if (typeof raw !== 'string') continue;
      if (!f.enum?.includes(raw)) continue;
      patches[f.key] = raw;
      labels[f.key] = f.label + ': ' + raw;
    } else if (f.kind === 'enum-multi') {
      if (!Array.isArray(raw)) continue;
      const clean = raw.filter((v): v is string => typeof v === 'string' && (f.enum?.includes(v) ?? false));
      if (clean.length === 0) continue;
      patches[f.key] = clean;
      labels[f.key] = f.label + ': ' + clean.join(', ');
    } else if (f.kind === 'number') {
      const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
      if (!Number.isFinite(n) || n <= 0) continue;
      patches[f.key] = String(Math.round(n));
      labels[f.key] = f.label + ': ' + Math.round(n);
    } else if (f.kind === 'range-1-10') {
      const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
      if (!Number.isFinite(n)) continue;
      const clamped = Math.max(1, Math.min(10, Math.round(n)));
      patches[f.key] = clamped;
      labels[f.key] = f.label + ': ' + clamped + '/10';
    } else if (f.kind === 'text') {
      if (typeof raw !== 'string') continue;
      patches[f.key] = raw.trim();
      labels[f.key] = f.label + ': ' + raw.trim();
    }
  }

  return {
    patches: patches as Partial<PatientData> & { height?: string; weight?: string },
    labels,
  };
}

/**
 * Quick local pattern-match for unambiguous meta-requests.
 * The LLM still gets a chance to set its own metaRequest; this is a defence-
 * in-depth so that "go back" / "repeat" / "exit" never reach the scoring layer
 * even if the model misses them.
 */
function detectLocalMetaRequest(text: string): MetaRequestKind | null {
  const t = text.toLowerCase().trim();
  if (/(go back|previous|edit|change my last|fix my last|change my answer)/.test(t)) return 'edit_previous';
  if (/(repeat|say again|what was the question)/.test(t)) return 'repeat';
  if (/(don't understand|do not understand|what does .* mean|explain|clarify)/.test(t)) return 'clarify';
  if (/(skip|don't want to answer|do not want to answer|prefer not)/.test(t)) return 'skip';
  if (/(end (the )?(assessment|session)|exit|stop now|quit|save and resume)/.test(t)) return 'end_session';
  return null;
}
