/**
 * Red Flag Engine — Priority-first red flag evaluation
 * MOST CRITICAL component of the CDE. Runs BEFORE any other evaluation.
 * A positive red flag IMMEDIATELY halts the session.
 */

import type { FactStore, RedFlagResult, TriggeredFlag } from '@/types/cde';
import { evaluateCriteria } from '../engine/rule-evaluator';
import { RED_FLAG_REGISTRY, URGENCY_PRIORITY } from './red-flag-registry';

/**
 * Check if any red flag data has been collected.
 * If no red flag fields have been screened yet, we cannot safely determine absence.
 */
function hasRedFlagData(facts: FactStore): boolean {
  // Check if any red flag-related fields have been set
  const redFlagKeys = Object.keys(facts.redFlags);
  if (redFlagKeys.some((k) => facts.redFlags[k] !== null)) return true;

  // Also check neurological signals which feed into red flags
  if (facts.bowelBladderChange !== null) return true;
  if (facts.numbness !== null) return true;
  if (facts.tingling !== null) return true;
  if (facts.weakness !== null) return true;
  if (facts.balanceAffected !== null) return true;

  return false;
}

/** Hard safety rules that apply regardless of decision tree logic */
export const HARD_SAFETY_RULES = {
  severity_ceiling: {
    description: 'Pain severity >= 8/10 triggers clinician referral recommendation',
    threshold: 8,
    action: 'recommend_clinical_evaluation',
    overrideAllowed: false,
  },
  age_restriction: {
    description: 'Users under 16 require guardian consent and modified pathways',
    threshold: 16,
    action: 'redirect_to_pediatric_pathway',
    overrideAllowed: false,
  },
  no_diagnosis: {
    description: 'System NEVER provides a medical diagnosis',
    action: 'always_frame_as_assessment_and_recommendation',
    overrideAllowed: false,
  },
  medication_boundary: {
    description: 'System NEVER recommends medications',
    action: 'refer_to_healthcare_provider_for_medication',
    overrideAllowed: false,
  },
} as const;

/**
 * Evaluate ALL red flags against the current fact store.
 *
 * Evaluation order:
 * 1. Tier 1 (IMMEDIATE) checked first
 * 2. If ANY Tier 1 triggers, return immediately
 * 3. Then Tier 2 (URGENT)
 * 4. Then Tier 3 (SPECIALIST)
 * 5. Severity ceiling check (>= 8/10 — non-halting recommendation)
 */
export function evaluateRedFlags(facts: FactStore): RedFlagResult {
  // If no red flag data has been collected, return insufficient data
  if (!hasRedFlagData(facts)) {
    return {
      triggered: false,
      flags: [],
      highestUrgency: 'none',
      insufficientData: true,
      severityCeiling: false,
      severityCeilingMessage: null,
    };
  }

  const triggeredFlags: TriggeredFlag[] = [];

  // Sort registry by urgency priority (immediate first)
  const sortedFlags = [...RED_FLAG_REGISTRY].sort(
    (a, b) => (URGENCY_PRIORITY[a.urgency] ?? 99) - (URGENCY_PRIORITY[b.urgency] ?? 99)
  );

  // Track current tier being processed
  let currentTier = 'immediate';
  let foundImmediateTrigger = false;

  for (const flagDef of sortedFlags) {
    // If we found an immediate trigger and we're past immediate tier, stop
    if (foundImmediateTrigger && flagDef.urgency !== 'immediate') {
      break;
    }

    // Evaluate this flag's criteria against the fact store
    const triggered = evaluateCriteria(flagDef.criteria, facts);

    if (triggered) {
      triggeredFlags.push({
        flagId: flagDef.id,
        urgency: flagDef.urgency,
        haltMessage: flagDef.haltMessage,
        haltAction: flagDef.haltAction,
      });

      if (flagDef.urgency === 'immediate') {
        foundImmediateTrigger = true;
      }
    }

    currentTier = flagDef.urgency;
  }

  // Severity ceiling check (non-halting — does NOT override red flags)
  const severity = (facts.severity ?? null) as number | null;
  const severityCeiling = severity !== null && severity >= HARD_SAFETY_RULES.severity_ceiling.threshold;
  const severityCeilingMessage = severityCeiling
    ? 'Your pain level is high (8+/10). We recommend you also consult a healthcare professional for a clinical evaluation.'
    : null;

  if (triggeredFlags.length === 0) {
    return {
      triggered: false,
      flags: [],
      highestUrgency: 'none',
      severityCeiling,
      severityCeilingMessage,
    };
  }

  // Determine highest urgency
  const highestUrgency = triggeredFlags.reduce((highest, flag) => {
    const currentPriority = URGENCY_PRIORITY[highest] ?? 99;
    const flagPriority = URGENCY_PRIORITY[flag.urgency] ?? 99;
    return flagPriority < currentPriority ? flag.urgency : highest;
  }, 'none' as string);

  return {
    triggered: true,
    flags: triggeredFlags,
    highestUrgency: highestUrgency as RedFlagResult['highestUrgency'],
    severityCeiling,
    severityCeilingMessage,
  };
}
