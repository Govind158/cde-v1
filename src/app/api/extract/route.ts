/**
 * POST /api/extract
 *
 * Takes a user's free-text description of their pain and the current node context,
 * asks OpenAI to map it to structured PatientData fields, and returns the
 * resulting patch + human-readable labels for the confirmation card.
 *
 * The LLM's only job is extraction. It never evaluates, scores, or diagnoses.
 * All option values are snapped to the enum lists defined in extract-schema.ts;
 * any value outside the enum is rejected server-side.
 */

import { NextResponse } from 'next/server';
import { EXTRACT_FIELDS, type ExtractField, type ExtractRequest, type ExtractResponse } from '@/lib/extract-schema';
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

  // Filter to only fields NOT yet answered — keeps prompt compact.
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
        { success: false, patches: {}, labels: {}, error: `OpenAI ${res.status}: ${errText.slice(0, 200)}` },
        { status: 502 },
      );
    }
    completion = await res.json();
  } catch (e) {
    return NextResponse.json(
      { success: false, patches: {}, labels: {}, error: `Fetch failed: ${(e as Error).message}` },
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

  return NextResponse.json({ success: true, patches, labels, notes });
}

// ─────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a strict extraction function for a musculoskeletal pain questionnaire.
Your ONLY job is to read the user's free-text description and map it into pre-defined structured fields.

RULES (violating any of these is a failure):
1. Return a valid JSON object. No prose, no markdown, no code fences.
2. Populate ONLY fields where the user's text gives a clear, confident signal. If unsure, OMIT the field entirely.
3. For enum fields, the value MUST be copied verbatim from the provided options list. Never invent new values. Never paraphrase.
4. For multi-select fields, return an array of verbatim option strings.
5. Do NOT evaluate, diagnose, rank, or interpret clinically. You only translate natural language → option labels.
6. Numeric fields: integers only. Height in cm, weight in kg, age in years.
7. Keep a short "notes" field (<= 120 chars) summarising what you captured and/or what you deliberately skipped.
8. Never fabricate information the user did not state or clearly imply.`;

function buildPrompt(userText: string, nodeId: string, fields: ExtractField[]): string {
  const fieldBlock = fields
    .map((f) => {
      const opts = f.enum ? `\n  options: ${JSON.stringify(f.enum)}` : '';
      const hint = f.hint ? `\n  hint: ${f.hint}` : '';
      return `- ${f.key} (${f.kind}) — ${f.label}${opts}${hint}`;
    })
    .join('\n');

  return `Current active question node: ${nodeId}
The user's free-text message is below. Extract whatever fields you can confidently fill.

Fields available to populate:
${fieldBlock}

User message:
"""
${userText}
"""

Return JSON with this exact shape:
{
  "<field_key>": <value or array of values>,
  ...,
  "notes": "short sentence on what was captured"
}
Only include keys you are confident about. Omit everything else.`;
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
      labels[f.key] = `${f.label}: ${raw}`;
    } else if (f.kind === 'enum-multi') {
      if (!Array.isArray(raw)) continue;
      const clean = raw.filter((v): v is string => typeof v === 'string' && (f.enum?.includes(v) ?? false));
      if (clean.length === 0) continue;
      patches[f.key] = clean;
      labels[f.key] = `${f.label}: ${clean.join(', ')}`;
    } else if (f.kind === 'number') {
      const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
      if (!Number.isFinite(n) || n <= 0) continue;
      // age/height/weight are stored as strings in PatientData (except bmi)
      patches[f.key] = String(Math.round(n));
      labels[f.key] = `${f.label}: ${Math.round(n)}`;
    } else if (f.kind === 'range-1-10') {
      const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
      if (!Number.isFinite(n)) continue;
      const clamped = Math.max(1, Math.min(10, Math.round(n)));
      patches[f.key] = clamped;
      labels[f.key] = `${f.label}: ${clamped}/10`;
    } else if (f.kind === 'text') {
      if (typeof raw !== 'string') continue;
      patches[f.key] = raw.trim();
      labels[f.key] = `${f.label}: ${raw.trim()}`;
    }
  }

  return {
    patches: patches as Partial<PatientData> & { height?: string; weight?: string },
    labels,
  };
}
