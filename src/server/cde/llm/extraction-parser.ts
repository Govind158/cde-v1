/**
 * Extraction Parser — Parse LLM output into conversation + structured FactStore data
 * Multi-strategy parser handles every format the LLM might use.
 */

import type { ExtractionResult, FactStore } from '@/types/cde';

const VALID_FACT_STORE_FIELDS = new Set([
  'bodyRegion', 'conditionMentioned', 'symptom', 'severity', 'duration',
  'onset', 'aggravatingFactors', 'easingFactors', 'radiation', 'painPattern',
  'painQuality', 'numbness', 'tingling', 'weakness', 'bowelBladderChange',
  'balanceAffected', 'redFlags', 'functionalImpact', 'imaging', 'age', 'sex',
  'activityLevel', 'userGoals', 'priorConditions', 'medicalHistory', 'morningStiffnessDuration',
  'gameScores', 'riskLevel', 'activeHypotheses', 'conditionTags', 'crossScanTags',
  'completedGames', 'prePopulatedContext',
]);

// ─── Helpers ───

/** Safely parse JSON with cleanup — strips markdown code fences, finds first/last brace */
function safeParseJSON(text: string): Record<string, unknown> | null {
  try {
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```$/, '');
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) return null;
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    const result = JSON.parse(cleaned);
    return (typeof result === 'object' && result !== null && !Array.isArray(result))
      ? (result as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Check if parsed JSON looks like a CDE extraction (has ≥2 clinical fields) */
function isExtractionObject(obj: Record<string, unknown>): boolean {
  const extractionKeys = ['bodyRegion', 'severity', 'cdeReady', 'redFlags', 'missingFields', 'symptom'];
  return extractionKeys.filter((k) => k in obj).length >= 2;
}

/** Remove any leaked JSON / headers / code blocks from conversation text */
function cleanConversation(text: string): string {
  return text
    .replace(/```(?:json)?[\s\S]*?```/g, '')
    .replace(/\{[\s\S]*?"bodyRegion"[\s\S]*?\}/g, '')
    .replace(/\{[\s\S]*?"cdeReady"[\s\S]*?\}/g, '')
    .replace(/#{1,3}\s*(?:structured\s*)?extraction[\s\S]*/gi, '')
    .replace(/#{1,3}\s*conversation\s*response\s*/gi, '')
    .replace(/here'?s what i'?ve gathered[\s\S]*?---/gi, '')
    .replace(/---\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── Main parser ───

/**
 * Parse an LLM response that contains both conversation text and a structured JSON extraction.
 * Uses 6 strategies in priority order to handle every format the LLM might produce.
 */
export function parseExtraction(llmResponse: string): ExtractionResult {
  let rawJson: Record<string, unknown> | null = null;
  let conversationText = llmResponse;

  // Strategy 1: Expected ---EXTRACTION--- delimiter
  const delimiterIndex = llmResponse.indexOf('---EXTRACTION---');
  if (delimiterIndex !== -1) {
    const conversation = llmResponse.substring(0, delimiterIndex).trim();
    const jsonPart = llmResponse.substring(delimiterIndex + '---EXTRACTION---'.length).trim();
    const parsed = safeParseJSON(jsonPart);
    if (parsed) {
      rawJson = parsed;
      conversationText = conversation;
    }
  }

  // Strategy 2: <structured_extraction> XML tags
  if (!rawJson) {
    const xmlMatch = llmResponse.match(/<structured_extraction>([\s\S]*?)<\/structured_extraction>/);
    if (xmlMatch) {
      const parsed = safeParseJSON(xmlMatch[1]);
      if (parsed) {
        rawJson = parsed;
        conversationText = llmResponse
          .replace(/<structured_extraction>[\s\S]*?<\/structured_extraction>/, '')
          .trim();
      }
    }
  }

  // Strategy 3: Markdown headers (### Structured extraction, ### Extraction, etc.)
  if (!rawJson) {
    const headerRegex = /(?:^|\n)#{1,3}\s*(?:structured\s*)?extraction\s*\n/i;
    const headerMatch = llmResponse.match(headerRegex);
    if (headerMatch && headerMatch.index !== undefined) {
      const conversation = llmResponse.substring(0, headerMatch.index).trim();
      const rest = llmResponse.substring(headerMatch.index);
      const parsed = safeParseJSON(rest);
      if (parsed) {
        rawJson = parsed;
        conversationText = cleanConversation(conversation);
      }
    }
  }

  // Strategy 4: ```json code block anywhere in response
  if (!rawJson) {
    const codeBlockRegex = /```(?:json)?\s*\n([\s\S]*?)\n\s*```/;
    const codeMatch = llmResponse.match(codeBlockRegex);
    if (codeMatch) {
      const parsed = safeParseJSON(codeMatch[1]);
      if (parsed && isExtractionObject(parsed)) {
        let cutPoint = llmResponse.indexOf(codeMatch[0]);
        // Check if there's a header line immediately before the code block
        const textBefore = llmResponse.substring(0, cutPoint);
        const lines = textBefore.split('\n');
        const lastLine = lines[lines.length - 1]?.trim() ?? '';
        if (lastLine.startsWith('#') || lastLine.toLowerCase().includes('extraction') || lastLine === '---') {
          lines.pop();
          cutPoint = lines.join('\n').length;
        }
        rawJson = parsed;
        conversationText = cleanConversation(llmResponse.substring(0, cutPoint).trim());
      }
    }
  }

  // Strategy 5: Find the last JSON object in the response (greedy backward search)
  if (!rawJson) {
    const lastBrace = llmResponse.lastIndexOf('}');
    if (lastBrace > 50) {
      let depth = 0;
      let start = -1;
      for (let i = lastBrace; i >= 0; i--) {
        if (llmResponse[i] === '}') depth++;
        if (llmResponse[i] === '{') depth--;
        if (depth === 0) { start = i; break; }
      }
      if (start > 0) {
        const jsonStr = llmResponse.substring(start, lastBrace + 1);
        const parsed = safeParseJSON(jsonStr);
        if (parsed && isExtractionObject(parsed)) {
          rawJson = parsed;
          conversationText = cleanConversation(llmResponse.substring(0, start).trim());
        }
      }
    }
  }

  // Strategy 6: Nothing found — return cleaned response with no extraction
  if (!rawJson) {
    console.error('[parseExtraction] FAILED to extract JSON from LLM response. Length:', llmResponse.length);
    return {
      conversationResponse: cleanConversation(llmResponse),
      extraction: {},
      cdeReady: false,
      missingFields: ['Unable to parse extraction'],
      error: true,
    };
  }

  // ─── Build ExtractionResult from rawJson ───

  const cdeReady = rawJson.cdeReady === true;
  const missingFields = Array.isArray(rawJson.missingFields)
    ? (rawJson.missingFields as string[])
    : [];

  // Strip non-FactStore fields and metadata
  const extraction: Partial<FactStore> = {};
  for (const [key, value] of Object.entries(rawJson)) {
    if (key === 'cdeReady' || key === 'missingFields' || key === 'confidence') continue;
    if (!VALID_FACT_STORE_FIELDS.has(key)) continue;
    if (value === null || value === undefined) continue;

    // Validate severity range
    if (key === 'severity' && typeof value === 'number') {
      if (value < 0 || value > 10) continue;
    }

    (extraction as Record<string, unknown>)[key] = value;
  }

  return {
    conversationResponse: conversationText,
    extraction,
    cdeReady,
    missingFields,
  };
}
