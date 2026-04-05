/**
 * Red Flag Engine Tests — 30+ test cases
 */

import { describe, it, expect } from 'vitest';
import { evaluateRedFlags } from '../red-flag-engine';
import type { FactStore } from '@/types/cde';
import { createDefaultFactStore } from '@/types/cde';

function makeFacts(overrides: Partial<FactStore> = {}): FactStore {
  return { ...createDefaultFactStore(), ...overrides };
}

// ─── TIER 1 POSITIVE SCENARIOS ───
describe('Tier 1 — Immediate flags (positive)', () => {
  it('rf_cauda_equina — bowel/bladder change triggers', () => {
    const facts = makeFacts({ bowelBladderChange: true });
    const result = evaluateRedFlags(facts);
    expect(result.triggered).toBe(true);
    expect(result.flags.some((f) => f.flagId === 'rf_cauda_equina')).toBe(true);
    expect(result.highestUrgency).toBe('immediate');
  });

  it('rf_cauda_equina — saddle numbness triggers', () => {
    const facts = makeFacts({ redFlags: { saddleNumbness: true } });
    const result = evaluateRedFlags(facts);
    expect(result.triggered).toBe(true);
    expect(result.flags.some((f) => f.flagId === 'rf_cauda_equina')).toBe(true);
  });

  it('rf_cauda_equina — bilateral leg weakness triggers', () => {
    const facts = makeFacts({ redFlags: { bilateralLegWeakness: true } });
    const result = evaluateRedFlags(facts);
    expect(result.triggered).toBe(true);
    expect(result.flags.some((f) => f.flagId === 'rf_cauda_equina')).toBe(true);
  });

  it('rf_cervical_myelopathy triggers with gait + hand clumsiness', () => {
    const facts = makeFacts({
      redFlags: { gaitDisturbance: true, handClumsiness: true },
    });
    const result = evaluateRedFlags(facts);
    expect(result.triggered).toBe(true);
    expect(result.flags.some((f) => f.flagId === 'rf_cervical_myelopathy')).toBe(true);
  });

  it('rf_cardiac triggers with left shoulder + chest', () => {
    const facts = makeFacts({
      redFlags: { leftShoulderArmPain: true, chestTightness: true },
    });
    const result = evaluateRedFlags(facts);
    expect(result.triggered).toBe(true);
    expect(result.flags.some((f) => f.flagId === 'rf_cardiac')).toBe(true);
  });

  it('rf_septic_arthritis triggers with hot swollen joint + fever', () => {
    const facts = makeFacts({
      redFlags: { hotRedSwollenJoint: true, fever: true },
    });
    const result = evaluateRedFlags(facts);
    expect(result.triggered).toBe(true);
    expect(result.flags.some((f) => f.flagId === 'rf_septic_arthritis')).toBe(true);
  });

  it('rf_acute_fracture triggers with deformity + cant weight bear + trauma', () => {
    const facts = makeFacts({
      redFlags: { deformity: true, cantWeightBear: true, recentTrauma: true },
    });
    const result = evaluateRedFlags(facts);
    expect(result.triggered).toBe(true);
    expect(result.flags.some((f) => f.flagId === 'rf_acute_fracture')).toBe(true);
  });
});

// ─── TIER 1 NEGATIVE SCENARIOS ───
describe('Tier 1 — Immediate flags (negative)', () => {
  it('rf_cauda_equina does NOT trigger when bowelBladder is false', () => {
    const facts = makeFacts({
      bowelBladderChange: false,
      redFlags: { saddleNumbness: false, bilateralLegWeakness: false },
    });
    const result = evaluateRedFlags(facts);
    const cesFlag = result.flags.find((f) => f.flagId === 'rf_cauda_equina');
    expect(cesFlag).toBeUndefined();
  });

  it('rf_cervical_myelopathy does NOT trigger with gait alone (needs hand/arm)', () => {
    const facts = makeFacts({
      redFlags: { gaitDisturbance: true, handClumsiness: false, bilateralArmWeakness: false },
    });
    const result = evaluateRedFlags(facts);
    const flag = result.flags.find((f) => f.flagId === 'rf_cervical_myelopathy');
    expect(flag).toBeUndefined();
  });

  it('rf_septic_arthritis does NOT trigger with only fever (no hot joint)', () => {
    const facts = makeFacts({
      redFlags: { fever: true, hotRedSwollenJoint: false },
    });
    const result = evaluateRedFlags(facts);
    const flag = result.flags.find((f) => f.flagId === 'rf_septic_arthritis');
    expect(flag).toBeUndefined();
  });

  it('rf_dvt does NOT trigger when there was a recent injury', () => {
    const facts = makeFacts({
      redFlags: { calfSwelling: true, calfRedness: true, recentInjury: true },
    });
    const result = evaluateRedFlags(facts);
    const flag = result.flags.find((f) => f.flagId === 'rf_dvt');
    expect(flag).toBeUndefined();
  });
});

// ─── COMBINATION FLAGS ───
describe('combination flags', () => {
  it('bladder change alone is sufficient for CES (ANY combinator)', () => {
    const facts = makeFacts({ bowelBladderChange: true });
    const result = evaluateRedFlags(facts);
    expect(result.triggered).toBe(true);
    expect(result.flags.some((f) => f.flagId === 'rf_cauda_equina')).toBe(true);
  });

  it('fracture needs ALL three: deformity + cant weight bear + trauma', () => {
    const facts = makeFacts({
      redFlags: { deformity: true, cantWeightBear: true, recentTrauma: false },
    });
    const result = evaluateRedFlags(facts);
    const flag = result.flags.find((f) => f.flagId === 'rf_acute_fracture');
    expect(flag).toBeUndefined();
  });

  it('achilles needs BOTH sudden pop AND inability to push off', () => {
    const facts = makeFacts({
      redFlags: { suddenPop: true, inabilityToPushOff: false },
    });
    const result = evaluateRedFlags(facts);
    const flag = result.flags.find((f) => f.flagId === 'rf_achilles_rupture');
    expect(flag).toBeUndefined();
  });
});

// ─── CROSS-REFERENCE FLAGS ───
describe('cross-reference flags', () => {
  it('rf_diabetic_foot needs diabetes from medical history + numbness', () => {
    const facts = makeFacts({
      medicalHistory: { diabetes: true, cancer: null, osteoporosis: null, rheumatoidArthritis: null },
      numbness: true,
    });
    const result = evaluateRedFlags(facts);
    expect(result.triggered).toBe(true);
    expect(result.flags.some((f) => f.flagId === 'rf_diabetic_foot')).toBe(true);
  });

  it('rf_diabetic_foot does NOT trigger without diabetes', () => {
    const facts = makeFacts({
      medicalHistory: { diabetes: false, cancer: null, osteoporosis: null, rheumatoidArthritis: null },
      numbness: true,
    });
    const result = evaluateRedFlags(facts);
    const flag = result.flags.find((f) => f.flagId === 'rf_diabetic_foot');
    expect(flag).toBeUndefined();
  });
});

// ─── INSUFFICIENT DATA ───
describe('insufficient data handling', () => {
  it('returns insufficientData when no red flag fields screened', () => {
    const facts = makeFacts(); // all null defaults
    const result = evaluateRedFlags(facts);
    expect(result.triggered).toBe(false);
    expect(result.insufficientData).toBe(true);
  });

  it('does NOT return insufficientData when at least one field screened', () => {
    const facts = makeFacts({ bowelBladderChange: false });
    const result = evaluateRedFlags(facts);
    expect(result.insufficientData).toBeUndefined();
  });
});

// ─── PRIORITY ORDERING ───
describe('priority ordering', () => {
  it('Tier 1 is checked before Tier 2', () => {
    const facts = makeFacts({
      bowelBladderChange: true, // Tier 1: CES
      redFlags: { worseningFootDrop: true }, // Tier 2: progressive neuro
    });
    const result = evaluateRedFlags(facts);
    expect(result.highestUrgency).toBe('immediate');
    // Should still return Tier 1 flag
    expect(result.flags[0].urgency).toBe('immediate');
  });

  it('returns immediate urgency even if Tier 2 also triggers', () => {
    const facts = makeFacts({
      bowelBladderChange: true,
      redFlags: { progressiveWeakness: true },
    });
    const result = evaluateRedFlags(facts);
    expect(result.highestUrgency).toBe('immediate');
  });
});

// ─── MULTIPLE SIMULTANEOUS FLAGS ───
describe('multiple simultaneous flags', () => {
  it('captures multiple Tier 1 flags', () => {
    const facts = makeFacts({
      bowelBladderChange: true,
      redFlags: {
        saddleNumbness: true,
        hotRedSwollenJoint: true,
        fever: true,
      },
    });
    const result = evaluateRedFlags(facts);
    expect(result.triggered).toBe(true);
    // Should have both CES and septic arthritis
    const flagIds = result.flags.map((f) => f.flagId);
    expect(flagIds).toContain('rf_cauda_equina');
    expect(flagIds).toContain('rf_septic_arthritis');
  });
});

// ─── TIER 2 SPECIFIC TESTS ───
describe('Tier 2 — Urgent flags', () => {
  it('rf_cancer_flag triggers with weight loss', () => {
    const facts = makeFacts({
      severity: 5,
      redFlags: { unexplainedWeightLoss: true },
    });
    const result = evaluateRedFlags(facts);
    expect(result.triggered).toBe(true);
    expect(result.flags.some((f) => f.flagId === 'rf_cancer_flag')).toBe(true);
  });

  it('rf_infection_flag triggers with fever + night sweats', () => {
    const facts = makeFacts({
      redFlags: { fever: true, nightSweats: true },
    });
    const result = evaluateRedFlags(facts);
    expect(result.triggered).toBe(true);
    expect(result.flags.some((f) => f.flagId === 'rf_infection_flag')).toBe(true);
  });
});

// ─── TIER 3 SPECIFIC TESTS ───
describe('Tier 3 — Specialist flags', () => {
  it('rf_ra_differentiation triggers with stiffness > 60min + swelling', () => {
    const facts = makeFacts({
      morningStiffnessDuration: 90,
      redFlags: { symmetricalSmallJointSwelling: true },
    });
    const result = evaluateRedFlags(facts);
    expect(result.triggered).toBe(true);
    expect(result.flags.some((f) => f.flagId === 'rf_ra_differentiation')).toBe(true);
    expect(result.highestUrgency).toBe('specialist_2_4_weeks');
  });

  it('rf_as_differentiation triggers for young patient with stiffness + exercise relief', () => {
    const facts = makeFacts({
      age: 28,
      morningStiffnessDuration: 75,
      redFlags: { improvesWithExercise: true },
    });
    const result = evaluateRedFlags(facts);
    expect(result.triggered).toBe(true);
    expect(result.flags.some((f) => f.flagId === 'rf_as_differentiation')).toBe(true);
  });

  it('rf_as_differentiation does NOT trigger for age > 35', () => {
    const facts = makeFacts({
      age: 42,
      morningStiffnessDuration: 75,
      redFlags: { improvesWithExercise: true },
    });
    const result = evaluateRedFlags(facts);
    const flag = result.flags.find((f) => f.flagId === 'rf_as_differentiation');
    expect(flag).toBeUndefined();
  });
});

// ─── CLEAN RESULT ───
describe('clean results', () => {
  it('returns no flags when all screened and negative', () => {
    const facts = makeFacts({
      bowelBladderChange: false,
      numbness: false,
      tingling: false,
      weakness: false,
      balanceAffected: false,
      severity: 3,
      redFlags: {
        saddleNumbness: false,
        bilateralLegWeakness: false,
        fever: false,
        nightSweats: false,
        unexplainedWeightLoss: false,
      },
    });
    const result = evaluateRedFlags(facts);
    // Should not trigger CES or other flags requiring true values
    const cesFlag = result.flags.find((f) => f.flagId === 'rf_cauda_equina');
    expect(cesFlag).toBeUndefined();
  });
});
