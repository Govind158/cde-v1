/**
 * 50 Clinical Test Cases for the Low Back Pain Decision Tree
 * Each test case maps to a specific clinical scenario.
 */

import type { FactStore, RiskLevel, RiskTier } from '@/types/cde';
import { createDefaultFactStore } from '@/types/cde';

interface LBPTestCase {
  id: string;
  description: string;
  persona: string;
  inputFacts: Partial<FactStore>;
  expectedOutputs: {
    riskLevel: RiskLevel | null;
    riskTier: RiskTier;
    primaryHypothesis: string;
    hypothesisConfidence: string;
    gamesRecommended: { mustInclude: string[]; mustNotInclude: string[] };
    conditionTags: string[];
    crossScanRecommended: string[];
    redFlagTriggered: boolean;
    redFlagId?: string;
    carePathwayCategory: string;
  };
}

export const LBP_TEST_CASES: LBPTestCase[] = [
  // ═══════════════════════════════════════════
  // TYPICAL PRESENTATIONS (1-15)
  // ═══════════════════════════════════════════

  // Persona 1: Arjun (31, desk worker, mild, acute)
  {
    id: 'TC01',
    description: 'Arjun: mild acute LBP, desk worker, sitting aggravates',
    persona: 'Arjun (31, desk worker)',
    inputFacts: {
      age: 31, sex: 'male', bodyRegion: 'lumbar_spine', severity: 3,
      duration: 'acute_0_6_weeks', aggravatingFactors: ['sitting'],
      radiation: 'dull_ache', activityLevel: 'sedentary',
      redFlags: { caudaEquina: false, systemic: false },
      functionalImpact: { sleep: 0, work: 1, exercise: 0, adl: 1 },
    },
    expectedOutputs: {
      riskLevel: 'GREEN', riskTier: 'GREEN', primaryHypothesis: 'hyp_postural_lbp',
      hypothesisConfidence: 'high',
      gamesRecommended: { mustInclude: ['NN2', 'FA3', 'BB1'], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'self_managed',
    },
  },
  {
    id: 'TC02',
    description: 'Arjun variant: mild acute, standing aggravates',
    persona: 'Arjun (31, desk worker)',
    inputFacts: {
      age: 31, sex: 'male', bodyRegion: 'lumbar_spine', severity: 2,
      duration: 'acute_0_6_weeks', aggravatingFactors: ['standing'],
      radiation: 'dull_ache', activityLevel: 'sedentary',
      redFlags: { caudaEquina: false }, functionalImpact: { sleep: 0, work: 0, exercise: 0, adl: 0 },
    },
    expectedOutputs: {
      riskLevel: 'GREEN', riskTier: 'GREEN', primaryHypothesis: 'hyp_postural_lbp',
      hypothesisConfidence: 'high',
      gamesRecommended: { mustInclude: ['NN2'], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'self_managed',
    },
  },
  {
    id: 'TC03',
    description: 'Arjun variant: mild acute, minimal functional impact',
    persona: 'Arjun (31, desk worker)',
    inputFacts: {
      age: 31, sex: 'male', bodyRegion: 'lumbar_spine', severity: 2,
      duration: 'acute_0_6_weeks', aggravatingFactors: ['sitting'],
      radiation: 'dull_ache', activityLevel: 'lightly_active',
      redFlags: { caudaEquina: false }, functionalImpact: { sleep: 0, work: 0, exercise: 0, adl: 0 },
    },
    expectedOutputs: {
      riskLevel: 'GREEN', riskTier: 'GREEN', primaryHypothesis: 'hyp_postural_lbp',
      hypothesisConfidence: 'high',
      gamesRecommended: { mustInclude: [], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'self_managed',
    },
  },
  {
    id: 'TC04',
    description: 'Arjun variant: moderate acute, bending aggravates',
    persona: 'Arjun (31, desk worker)',
    inputFacts: {
      age: 31, sex: 'male', bodyRegion: 'lumbar_spine', severity: 4,
      duration: 'acute_0_6_weeks', aggravatingFactors: ['flexion_lifting', 'sitting'],
      radiation: 'dull_ache', activityLevel: 'sedentary',
      redFlags: { caudaEquina: false }, functionalImpact: { sleep: 1, work: 1, exercise: 1, adl: 1 },
    },
    expectedOutputs: {
      riskLevel: 'GREEN', riskTier: 'GREEN', primaryHypothesis: 'hyp_flexion_intolerant',
      hypothesisConfidence: 'medium',
      gamesRecommended: { mustInclude: ['FA1', 'FA2'], mustNotInclude: ['FA5'] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'self_managed',
    },
  },
  {
    id: 'TC05',
    description: 'Arjun variant: acute onset after lifting',
    persona: 'Arjun (31, desk worker)',
    inputFacts: {
      age: 31, sex: 'male', bodyRegion: 'lumbar_spine', severity: 5,
      duration: 'acute_0_6_weeks', onset: 'sudden', aggravatingFactors: ['flexion_lifting'],
      radiation: 'sharp_burning', activityLevel: 'sedentary',
      redFlags: { caudaEquina: false }, functionalImpact: { sleep: 1, work: 2, exercise: 1, adl: 2 },
    },
    expectedOutputs: {
      riskLevel: 'ORANGE', riskTier: 'YELLOW', primaryHypothesis: 'hyp_flexion_intolerant',
      hypothesisConfidence: 'medium',
      gamesRecommended: { mustInclude: ['FA1'], mustNotInclude: ['FA5'] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'guided_program',
    },
  },

  // Persona 2: Sunita (47, chronic ignorer, moderate, chronic)
  {
    id: 'TC06',
    description: 'Sunita: chronic LBP, moderate, sedentary, recurrent',
    persona: 'Sunita (47, chronic ignorer)',
    inputFacts: {
      age: 47, sex: 'female', bodyRegion: 'lumbar_spine', severity: 6,
      duration: 'chronic_over_12_weeks', aggravatingFactors: ['sitting', 'standing', 'flexion_lifting'],
      radiation: 'dull_ache', activityLevel: 'sedentary', priorConditions: 'recurrent',
      redFlags: { caudaEquina: false, systemic: false },
      functionalImpact: { sleep: 2, work: 2, exercise: 2, adl: 2 },
    },
    expectedOutputs: {
      riskLevel: 'RED', riskTier: 'ORANGE', primaryHypothesis: 'hyp_deconditioning',
      hypothesisConfidence: 'medium',
      gamesRecommended: { mustInclude: ['BB1', 'NN1', 'KS1'], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'specialist_review',
    },
  },
  {
    id: 'TC07',
    description: 'Sunita variant: chronic with leg radiation',
    persona: 'Sunita (47, chronic ignorer)',
    inputFacts: {
      age: 47, sex: 'female', bodyRegion: 'lumbar_spine', severity: 7,
      duration: 'chronic_over_12_weeks', aggravatingFactors: ['sitting'],
      radiation: 'radiating_leg', activityLevel: 'sedentary', priorConditions: 'recurrent',
      redFlags: { caudaEquina: false }, functionalImpact: { sleep: 2, work: 2, exercise: 3, adl: 3 },
    },
    expectedOutputs: {
      riskLevel: 'RED', riskTier: 'ORANGE', primaryHypothesis: 'hyp_radicular',
      hypothesisConfidence: 'high',
      gamesRecommended: { mustInclude: ['KS1', 'FA1'], mustNotInclude: ['FA5'] },
      conditionTags: ['SCIATICA_DISC_BULGE'], crossScanRecommended: ['sciatica'],
      redFlagTriggered: false, carePathwayCategory: 'specialist_review',
    },
  },
  {
    id: 'TC08',
    description: 'Sunita variant: chronic, extension aggravates',
    persona: 'Sunita (47, chronic ignorer)',
    inputFacts: {
      age: 47, sex: 'female', bodyRegion: 'lumbar_spine', severity: 5,
      duration: 'chronic_over_12_weeks', aggravatingFactors: ['extension', 'standing'],
      radiation: 'dull_ache', activityLevel: 'sedentary',
      redFlags: { caudaEquina: false }, functionalImpact: { sleep: 1, work: 2, exercise: 2, adl: 2 },
    },
    expectedOutputs: {
      riskLevel: 'ORANGE', riskTier: 'YELLOW', primaryHypothesis: 'hyp_extension_intolerant',
      hypothesisConfidence: 'medium',
      gamesRecommended: { mustInclude: ['FA1', 'FA4', 'NN2'], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'guided_program',
    },
  },
  {
    id: 'TC09',
    description: 'Sunita variant: chronic with severe functional impact',
    persona: 'Sunita (47, chronic ignorer)',
    inputFacts: {
      age: 47, sex: 'female', bodyRegion: 'lumbar_spine', severity: 8,
      duration: 'chronic_over_12_weeks', aggravatingFactors: ['sitting', 'flexion_lifting', 'walking'],
      radiation: 'buttock_referral', activityLevel: 'sedentary', priorConditions: 'constant',
      redFlags: { caudaEquina: false }, functionalImpact: { sleep: 3, work: 3, exercise: 3, adl: 3 },
    },
    expectedOutputs: {
      riskLevel: 'RED', riskTier: 'ORANGE', primaryHypothesis: 'hyp_deconditioning',
      hypothesisConfidence: 'medium',
      gamesRecommended: { mustInclude: ['BB1'], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'specialist_review',
    },
  },
  {
    id: 'TC10',
    description: 'Sunita variant: subacute transitioning to chronic',
    persona: 'Sunita (47, chronic ignorer)',
    inputFacts: {
      age: 47, sex: 'female', bodyRegion: 'lumbar_spine', severity: 5,
      duration: 'subacute_6_12_weeks', aggravatingFactors: ['sitting'],
      radiation: 'dull_ache', activityLevel: 'sedentary',
      redFlags: { caudaEquina: false }, functionalImpact: { sleep: 1, work: 1, exercise: 1, adl: 1 },
    },
    expectedOutputs: {
      riskLevel: 'ORANGE', riskTier: 'YELLOW', primaryHypothesis: 'hyp_postural_lbp',
      hypothesisConfidence: 'high',
      gamesRecommended: { mustInclude: ['NN2', 'FA3'], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'guided_program',
    },
  },

  // Persona 3: Karthik (54, post-rehab, variable)
  {
    id: 'TC11',
    description: 'Karthik: post-rehab, moderate, mixed aggravators',
    persona: 'Karthik (54, post-rehab)',
    inputFacts: {
      age: 54, sex: 'male', bodyRegion: 'lumbar_spine', severity: 4,
      duration: 'chronic_over_12_weeks', aggravatingFactors: ['extension', 'morning_stiffness'],
      radiation: 'dull_ache', activityLevel: 'moderately_active', priorConditions: 'recurrent',
      redFlags: { caudaEquina: false }, functionalImpact: { sleep: 1, work: 0, exercise: 1, adl: 1 },
    },
    expectedOutputs: {
      riskLevel: 'ORANGE', riskTier: 'YELLOW', primaryHypothesis: 'hyp_extension_intolerant',
      hypothesisConfidence: 'medium',
      gamesRecommended: { mustInclude: ['FA1', 'FA4'], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'guided_program',
    },
  },
  {
    id: 'TC12',
    description: 'Karthik variant: well-managed, low functional impact',
    persona: 'Karthik (54, post-rehab)',
    inputFacts: {
      age: 54, sex: 'male', bodyRegion: 'lumbar_spine', severity: 2,
      duration: 'chronic_over_12_weeks', aggravatingFactors: ['sitting'],
      radiation: 'dull_ache', activityLevel: 'very_active',
      redFlags: { caudaEquina: false }, functionalImpact: { sleep: 0, work: 0, exercise: 0, adl: 0 },
    },
    expectedOutputs: {
      riskLevel: 'GREEN', riskTier: 'GREEN', primaryHypothesis: 'hyp_postural_lbp',
      hypothesisConfidence: 'high',
      gamesRecommended: { mustInclude: ['NN2'], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'self_managed',
    },
  },
  {
    id: 'TC13',
    description: 'Karthik variant: flare-up episode',
    persona: 'Karthik (54, post-rehab)',
    inputFacts: {
      age: 54, sex: 'male', bodyRegion: 'lumbar_spine', severity: 7,
      duration: 'acute_0_6_weeks', onset: 'sudden', aggravatingFactors: ['flexion_lifting', 'extension'],
      radiation: 'sharp_burning', activityLevel: 'moderately_active',
      redFlags: { caudaEquina: false }, functionalImpact: { sleep: 2, work: 2, exercise: 3, adl: 2 },
    },
    expectedOutputs: {
      riskLevel: 'ORANGE', riskTier: 'YELLOW', primaryHypothesis: 'hyp_flexion_intolerant',
      hypothesisConfidence: 'medium',
      gamesRecommended: { mustInclude: ['FA1'], mustNotInclude: ['FA5'] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'guided_program',
    },
  },
  {
    id: 'TC14',
    description: 'Karthik variant: degenerative pattern',
    persona: 'Karthik (54, post-rehab)',
    inputFacts: {
      age: 54, sex: 'male', bodyRegion: 'lumbar_spine', severity: 5,
      duration: 'chronic_over_12_weeks', aggravatingFactors: ['extension', 'walking'],
      radiation: 'dull_ache', activityLevel: 'lightly_active',
      imaging: { hasImaging: true, type: 'MRI', finding: 'degenerative_disc', level: 'L4-L5', recencyMonths: 6 },
      redFlags: { caudaEquina: false }, functionalImpact: { sleep: 1, work: 1, exercise: 2, adl: 1 },
    },
    expectedOutputs: {
      riskLevel: 'ORANGE', riskTier: 'YELLOW', primaryHypothesis: 'hyp_extension_intolerant',
      hypothesisConfidence: 'medium',
      gamesRecommended: { mustInclude: ['FA4', 'NN2'], mustNotInclude: [] },
      conditionTags: ['DEGENERATIVE_STREAM'], crossScanRecommended: ['spondylosis'],
      redFlagTriggered: false, carePathwayCategory: 'guided_program',
    },
  },
  {
    id: 'TC15',
    description: 'Karthik variant: improving post-rehab',
    persona: 'Karthik (54, post-rehab)',
    inputFacts: {
      age: 54, sex: 'male', bodyRegion: 'lumbar_spine', severity: 2,
      duration: 'subacute_6_12_weeks', aggravatingFactors: ['sitting'],
      radiation: 'dull_ache', activityLevel: 'moderately_active',
      redFlags: { caudaEquina: false }, functionalImpact: { sleep: 0, work: 0, exercise: 1, adl: 0 },
    },
    expectedOutputs: {
      riskLevel: 'GREEN', riskTier: 'GREEN', primaryHypothesis: 'hyp_postural_lbp',
      hypothesisConfidence: 'high',
      gamesRecommended: { mustInclude: ['NN2'], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'self_managed',
    },
  },

  // ═══════════════════════════════════════════
  // RED FLAG SCENARIOS (16-25)
  // ═══════════════════════════════════════════

  {
    id: 'TC16',
    description: 'CES: bladder control loss → EMERGENCY halt',
    persona: 'Red Flag',
    inputFacts: {
      bodyRegion: 'lumbar_spine', severity: 7, bowelBladderChange: true,
      redFlags: { caudaEquina: true }, aggravatingFactors: ['sitting'],
    },
    expectedOutputs: {
      riskLevel: null, riskTier: 'RED', primaryHypothesis: '',
      hypothesisConfidence: '', gamesRecommended: { mustInclude: [], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: true, redFlagId: 'rf_cauda_equina', carePathwayCategory: 'emergency',
    },
  },
  {
    id: 'TC17',
    description: 'CES: saddle numbness → EMERGENCY halt',
    persona: 'Red Flag',
    inputFacts: {
      bodyRegion: 'lumbar_spine', severity: 6, redFlags: { saddleNumbness: true },
      aggravatingFactors: ['sitting'],
    },
    expectedOutputs: {
      riskLevel: null, riskTier: 'RED', primaryHypothesis: '',
      hypothesisConfidence: '', gamesRecommended: { mustInclude: [], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: true, redFlagId: 'rf_cauda_equina', carePathwayCategory: 'emergency',
    },
  },
  {
    id: 'TC18',
    description: 'CES: bilateral leg weakness → EMERGENCY halt',
    persona: 'Red Flag',
    inputFacts: {
      bodyRegion: 'lumbar_spine', severity: 8, redFlags: { bilateralLegWeakness: true },
      aggravatingFactors: ['walking'],
    },
    expectedOutputs: {
      riskLevel: null, riskTier: 'RED', primaryHypothesis: '',
      hypothesisConfidence: '', gamesRecommended: { mustInclude: [], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: true, redFlagId: 'rf_cauda_equina', carePathwayCategory: 'emergency',
    },
  },
  {
    id: 'TC19',
    description: 'Cancer flag: weight loss + cancer history → URGENT halt',
    persona: 'Red Flag',
    inputFacts: {
      bodyRegion: 'lumbar_spine', severity: 5,
      redFlags: { unexplainedWeightLoss: true }, medicalHistory: { diabetes: null, cancer: true, osteoporosis: null, rheumatoidArthritis: null },
      aggravatingFactors: ['sitting'],
    },
    expectedOutputs: {
      riskLevel: null, riskTier: 'RED', primaryHypothesis: '',
      hypothesisConfidence: '', gamesRecommended: { mustInclude: [], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: true, redFlagId: 'rf_cancer_flag', carePathwayCategory: 'emergency',
    },
  },
  {
    id: 'TC20',
    description: 'Infection flag: fever + night sweats → URGENT halt',
    persona: 'Red Flag',
    inputFacts: {
      bodyRegion: 'lumbar_spine', severity: 6,
      redFlags: { fever: true, nightSweats: true },
      aggravatingFactors: ['all'],
    },
    expectedOutputs: {
      riskLevel: null, riskTier: 'RED', primaryHypothesis: '',
      hypothesisConfidence: '', gamesRecommended: { mustInclude: [], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: true, redFlagId: 'rf_infection_flag', carePathwayCategory: 'emergency',
    },
  },
  {
    id: 'TC21',
    description: 'Fracture flag: trauma + deformity + cant weight bear',
    persona: 'Red Flag',
    inputFacts: {
      age: 55, bodyRegion: 'lumbar_spine', severity: 9,
      redFlags: { deformity: true, cantWeightBear: true, recentTrauma: true },
      aggravatingFactors: ['all'],
    },
    expectedOutputs: {
      riskLevel: null, riskTier: 'RED', primaryHypothesis: '',
      hypothesisConfidence: '', gamesRecommended: { mustInclude: [], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: true, redFlagId: 'rf_acute_fracture', carePathwayCategory: 'emergency',
    },
  },
  {
    id: 'TC22',
    description: 'Combined CES: bladder + bilateral leg weakness',
    persona: 'Red Flag',
    inputFacts: {
      bodyRegion: 'lumbar_spine', severity: 9,
      bowelBladderChange: true, redFlags: { bilateralLegWeakness: true },
      aggravatingFactors: ['all'],
    },
    expectedOutputs: {
      riskLevel: null, riskTier: 'RED', primaryHypothesis: '',
      hypothesisConfidence: '', gamesRecommended: { mustInclude: [], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: true, redFlagId: 'rf_cauda_equina', carePathwayCategory: 'emergency',
    },
  },
  {
    id: 'TC23',
    description: 'Partial CES: bladder control only (single flag sufficient)',
    persona: 'Red Flag',
    inputFacts: {
      bodyRegion: 'lumbar_spine', severity: 5, bowelBladderChange: true,
      aggravatingFactors: ['sitting'],
    },
    expectedOutputs: {
      riskLevel: null, riskTier: 'RED', primaryHypothesis: '',
      hypothesisConfidence: '', gamesRecommended: { mustInclude: [], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: true, redFlagId: 'rf_cauda_equina', carePathwayCategory: 'emergency',
    },
  },
  {
    id: 'TC24',
    description: 'Trauma + age 30 → should NOT halt (no deformity/cant weight bear)',
    persona: 'Red Flag - Negative',
    inputFacts: {
      age: 30, bodyRegion: 'lumbar_spine', severity: 5, onset: 'after_injury',
      redFlags: { recentTrauma: true, deformity: false, cantWeightBear: false },
      aggravatingFactors: ['flexion_lifting'],
    },
    expectedOutputs: {
      riskLevel: 'ORANGE', riskTier: 'YELLOW', primaryHypothesis: 'hyp_flexion_intolerant',
      hypothesisConfidence: 'medium', gamesRecommended: { mustInclude: [], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'guided_program',
    },
  },
  {
    id: 'TC25',
    description: 'Cancer history without weight loss → should NOT halt',
    persona: 'Red Flag - Negative',
    inputFacts: {
      bodyRegion: 'lumbar_spine', severity: 4,
      medicalHistory: { diabetes: null, cancer: true, osteoporosis: null, rheumatoidArthritis: null },
      redFlags: { unexplainedWeightLoss: false },
      aggravatingFactors: ['sitting'],
    },
    expectedOutputs: {
      riskLevel: 'GREEN', riskTier: 'GREEN', primaryHypothesis: 'hyp_postural_lbp',
      hypothesisConfidence: 'high', gamesRecommended: { mustInclude: [], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'self_managed',
    },
  },

  // ═══════════════════════════════════════════
  // EDGE CASES (26-35)
  // ═══════════════════════════════════════════

  {
    id: 'TC26',
    description: 'Borderline LOW/MODERATE (score exactly 4)',
    persona: 'Edge Case',
    inputFacts: {
      bodyRegion: 'lumbar_spine', severity: 4, duration: 'acute_0_6_weeks',
      aggravatingFactors: ['sitting'], radiation: 'dull_ache', activityLevel: 'lightly_active',
      redFlags: { caudaEquina: false }, functionalImpact: { sleep: 1, work: 1, exercise: 0, adl: 1 },
    },
    expectedOutputs: {
      riskLevel: 'GREEN', riskTier: 'GREEN', primaryHypothesis: 'hyp_postural_lbp',
      hypothesisConfidence: 'high', gamesRecommended: { mustInclude: [], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'self_managed',
    },
  },
  {
    id: 'TC27',
    description: 'Borderline MODERATE/HIGH (score exactly 8)',
    persona: 'Edge Case',
    inputFacts: {
      bodyRegion: 'lumbar_spine', severity: 7, duration: 'chronic_over_12_weeks',
      aggravatingFactors: ['sitting', 'flexion_lifting'], radiation: 'buttock_referral',
      activityLevel: 'sedentary', redFlags: { caudaEquina: false },
      functionalImpact: { sleep: 2, work: 2, exercise: 2, adl: 2 },
    },
    expectedOutputs: {
      riskLevel: 'ORANGE', riskTier: 'YELLOW', primaryHypothesis: 'hyp_deconditioning',
      hypothesisConfidence: 'medium', gamesRecommended: { mustInclude: [], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'guided_program',
    },
  },
  {
    id: 'TC28',
    description: 'All maximum scores → HIGH',
    persona: 'Edge Case',
    inputFacts: {
      bodyRegion: 'lumbar_spine', severity: 10, duration: 'chronic_over_12_weeks',
      aggravatingFactors: ['sitting', 'standing', 'flexion_lifting', 'extension', 'walking', 'morning_stiffness'],
      radiation: 'radiating_leg', activityLevel: 'sedentary', priorConditions: 'constant',
      redFlags: { caudaEquina: false }, functionalImpact: { sleep: 3, work: 3, exercise: 3, adl: 3 },
    },
    expectedOutputs: {
      riskLevel: 'RED', riskTier: 'ORANGE', primaryHypothesis: 'hyp_radicular',
      hypothesisConfidence: 'high', gamesRecommended: { mustInclude: ['KS1'], mustNotInclude: ['FA5'] },
      conditionTags: ['SCIATICA_DISC_BULGE'], crossScanRecommended: ['sciatica'],
      redFlagTriggered: false, carePathwayCategory: 'specialist_review',
    },
  },
  {
    id: 'TC29',
    description: 'All minimum scores → LOW',
    persona: 'Edge Case',
    inputFacts: {
      bodyRegion: 'lumbar_spine', severity: 1, duration: 'acute_0_6_weeks',
      aggravatingFactors: ['sitting'], radiation: 'dull_ache', activityLevel: 'very_active',
      redFlags: { caudaEquina: false }, functionalImpact: { sleep: 0, work: 0, exercise: 0, adl: 0 },
    },
    expectedOutputs: {
      riskLevel: 'GREEN', riskTier: 'GREEN', primaryHypothesis: 'hyp_postural_lbp',
      hypothesisConfidence: 'high', gamesRecommended: { mustInclude: [], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'self_managed',
    },
  },
  {
    id: 'TC30',
    description: 'Contradictory: sitting + standing + walking all aggravate',
    persona: 'Edge Case',
    inputFacts: {
      bodyRegion: 'lumbar_spine', severity: 6, duration: 'subacute_6_12_weeks',
      aggravatingFactors: ['sitting', 'standing', 'walking'],
      radiation: 'dull_ache', activityLevel: 'sedentary',
      redFlags: { caudaEquina: false }, functionalImpact: { sleep: 2, work: 2, exercise: 2, adl: 2 },
    },
    expectedOutputs: {
      riskLevel: 'ORANGE', riskTier: 'YELLOW', primaryHypothesis: 'hyp_deconditioning',
      hypothesisConfidence: 'medium', gamesRecommended: { mustInclude: [], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'guided_program',
    },
  },
  {
    id: 'TC31',
    description: 'User selects "None" for everything → LOW',
    persona: 'Edge Case',
    inputFacts: {
      bodyRegion: 'lumbar_spine', severity: 1, duration: 'acute_0_6_weeks',
      aggravatingFactors: ['none'], radiation: 'dull_ache', activityLevel: 'moderately_active',
      redFlags: { caudaEquina: false }, functionalImpact: { sleep: 0, work: 0, exercise: 0, adl: 0 },
    },
    expectedOutputs: {
      riskLevel: 'GREEN', riskTier: 'GREEN', primaryHypothesis: '',
      hypothesisConfidence: '', gamesRecommended: { mustInclude: [], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'self_managed',
    },
  },
  {
    id: 'TC32',
    description: 'Chronic duration + minimal functional impact → MODERATE',
    persona: 'Edge Case',
    inputFacts: {
      bodyRegion: 'lumbar_spine', severity: 3, duration: 'chronic_over_12_weeks',
      aggravatingFactors: ['sitting'], radiation: 'dull_ache', activityLevel: 'moderately_active',
      redFlags: { caudaEquina: false }, functionalImpact: { sleep: 0, work: 0, exercise: 0, adl: 0 },
    },
    expectedOutputs: {
      riskLevel: 'ORANGE', riskTier: 'YELLOW', primaryHypothesis: 'hyp_postural_lbp',
      hypothesisConfidence: 'high', gamesRecommended: { mustInclude: [], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'guided_program',
    },
  },
  {
    id: 'TC33',
    description: 'Acute duration + severe functional impact → MODERATE',
    persona: 'Edge Case',
    inputFacts: {
      bodyRegion: 'lumbar_spine', severity: 8, duration: 'acute_0_6_weeks',
      aggravatingFactors: ['sitting', 'flexion_lifting'], radiation: 'sharp_burning',
      activityLevel: 'sedentary', redFlags: { caudaEquina: false },
      functionalImpact: { sleep: 3, work: 3, exercise: 3, adl: 3 },
    },
    expectedOutputs: {
      riskLevel: 'ORANGE', riskTier: 'YELLOW', primaryHypothesis: 'hyp_flexion_intolerant',
      hypothesisConfidence: 'medium', gamesRecommended: { mustInclude: [], mustNotInclude: ['FA5'] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'guided_program',
    },
  },
  {
    id: 'TC34',
    description: 'Maximum psychosocial risk: chronic + recurrent + sedentary → HIGH',
    persona: 'Edge Case',
    inputFacts: {
      bodyRegion: 'lumbar_spine', severity: 7, duration: 'chronic_over_12_weeks',
      aggravatingFactors: ['sitting', 'standing'], radiation: 'dull_ache',
      activityLevel: 'sedentary', priorConditions: 'constant',
      redFlags: { caudaEquina: false }, functionalImpact: { sleep: 3, work: 3, exercise: 3, adl: 3 },
    },
    expectedOutputs: {
      riskLevel: 'RED', riskTier: 'ORANGE', primaryHypothesis: 'hyp_deconditioning',
      hypothesisConfidence: 'medium', gamesRecommended: { mustInclude: ['BB1', 'NN1', 'KS1'], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'specialist_review',
    },
  },
  {
    id: 'TC35',
    description: 'Athlete with acute onset → LOW',
    persona: 'Edge Case',
    inputFacts: {
      age: 25, bodyRegion: 'lumbar_spine', severity: 4, duration: 'acute_0_6_weeks',
      aggravatingFactors: ['flexion_lifting'], radiation: 'sharp_burning',
      activityLevel: 'very_active', redFlags: { caudaEquina: false },
      functionalImpact: { sleep: 0, work: 0, exercise: 2, adl: 0 },
    },
    expectedOutputs: {
      riskLevel: 'GREEN', riskTier: 'GREEN', primaryHypothesis: 'hyp_flexion_intolerant',
      hypothesisConfidence: 'medium', gamesRecommended: { mustInclude: ['FA1'], mustNotInclude: ['FA5'] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'self_managed',
    },
  },

  // ═══════════════════════════════════════════
  // CROSS-SCAN SCENARIOS (36-45)
  // ═══════════════════════════════════════════

  {
    id: 'TC36',
    description: 'Leg pain below knee → SCIATICA_DISC_BULGE tag + sciatica scan',
    persona: 'Cross-Scan',
    inputFacts: {
      bodyRegion: 'lumbar_spine', severity: 6, duration: 'subacute_6_12_weeks',
      aggravatingFactors: ['sitting'], radiation: 'radiating_leg',
      redFlags: { caudaEquina: false }, functionalImpact: { sleep: 1, work: 1, exercise: 1, adl: 2 },
    },
    expectedOutputs: {
      riskLevel: 'ORANGE', riskTier: 'YELLOW', primaryHypothesis: 'hyp_radicular',
      hypothesisConfidence: 'high', gamesRecommended: { mustInclude: ['KS1', 'FA1'], mustNotInclude: ['FA5'] },
      conditionTags: ['SCIATICA_DISC_BULGE'], crossScanRecommended: ['sciatica'],
      redFlagTriggered: false, carePathwayCategory: 'guided_program',
    },
  },
  {
    id: 'TC37',
    description: 'Leg pain above knee only → no below-knee tag',
    persona: 'Cross-Scan',
    inputFacts: {
      bodyRegion: 'lumbar_spine', severity: 5, duration: 'subacute_6_12_weeks',
      aggravatingFactors: ['sitting'], radiation: 'buttock_referral',
      redFlags: { caudaEquina: false }, functionalImpact: { sleep: 1, work: 1, exercise: 0, adl: 1 },
    },
    expectedOutputs: {
      riskLevel: 'ORANGE', riskTier: 'YELLOW', primaryHypothesis: 'hyp_postural_lbp',
      hypothesisConfidence: 'high', gamesRecommended: { mustInclude: [], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'guided_program',
    },
  },
  {
    id: 'TC38',
    description: 'Chronic + extension pain + age >50 → DEGENERATIVE_STREAM',
    persona: 'Cross-Scan',
    inputFacts: {
      age: 55, bodyRegion: 'lumbar_spine', severity: 5, duration: 'chronic_over_12_weeks',
      aggravatingFactors: ['extension'], radiation: 'dull_ache', activityLevel: 'lightly_active',
      redFlags: { caudaEquina: false }, functionalImpact: { sleep: 1, work: 1, exercise: 1, adl: 1 },
    },
    expectedOutputs: {
      riskLevel: 'ORANGE', riskTier: 'YELLOW', primaryHypothesis: 'hyp_extension_intolerant',
      hypothesisConfidence: 'medium', gamesRecommended: { mustInclude: ['FA4', 'NN2'], mustNotInclude: [] },
      conditionTags: ['DEGENERATIVE_STREAM'], crossScanRecommended: ['spondylosis'],
      redFlagTriggered: false, carePathwayCategory: 'guided_program',
    },
  },
  {
    id: 'TC39',
    description: 'Postural pattern + sedentary → neck pain cross-scan',
    persona: 'Cross-Scan',
    inputFacts: {
      bodyRegion: 'lumbar_spine', severity: 4, duration: 'chronic_over_12_weeks',
      aggravatingFactors: ['sitting'], radiation: 'dull_ache', activityLevel: 'sedentary',
      redFlags: { caudaEquina: false }, functionalImpact: { sleep: 0, work: 1, exercise: 0, adl: 0 },
    },
    expectedOutputs: {
      riskLevel: 'ORANGE', riskTier: 'YELLOW', primaryHypothesis: 'hyp_deconditioning',
      hypothesisConfidence: 'medium', gamesRecommended: { mustInclude: [], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: ['neck_pain'],
      redFlagTriggered: false, carePathwayCategory: 'guided_program',
    },
  },
  {
    id: 'TC40',
    description: 'Flexion intolerant → FA5 contraindicated',
    persona: 'Cross-Scan',
    inputFacts: {
      bodyRegion: 'lumbar_spine', severity: 5, duration: 'subacute_6_12_weeks',
      aggravatingFactors: ['flexion_lifting'], radiation: 'sharp_burning',
      redFlags: { caudaEquina: false }, functionalImpact: { sleep: 1, work: 1, exercise: 1, adl: 1 },
    },
    expectedOutputs: {
      riskLevel: 'ORANGE', riskTier: 'YELLOW', primaryHypothesis: 'hyp_flexion_intolerant',
      hypothesisConfidence: 'medium', gamesRecommended: { mustInclude: ['FA1', 'FA2'], mustNotInclude: ['FA5'] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'guided_program',
    },
  },
  {
    id: 'TC41',
    description: 'Radicular pattern → recommend both Sciatica + Disc Bulge',
    persona: 'Cross-Scan',
    inputFacts: {
      bodyRegion: 'lumbar_spine', severity: 7, duration: 'subacute_6_12_weeks',
      aggravatingFactors: ['sitting', 'flexion_lifting'], radiation: 'radiating_leg',
      numbness: true, tingling: true, redFlags: { caudaEquina: false },
      functionalImpact: { sleep: 2, work: 2, exercise: 2, adl: 2 },
    },
    expectedOutputs: {
      riskLevel: 'RED', riskTier: 'ORANGE', primaryHypothesis: 'hyp_radicular',
      hypothesisConfidence: 'high', gamesRecommended: { mustInclude: ['KS1', 'FA1'], mustNotInclude: ['FA5'] },
      conditionTags: ['SCIATICA_DISC_BULGE'], crossScanRecommended: ['sciatica', 'disc_bulge'],
      redFlagTriggered: false, carePathwayCategory: 'specialist_review',
    },
  },
  {
    id: 'TC42',
    description: 'Multiple aggravating factors → union of games from multiple hypotheses',
    persona: 'Cross-Scan',
    inputFacts: {
      bodyRegion: 'lumbar_spine', severity: 5, duration: 'subacute_6_12_weeks',
      aggravatingFactors: ['sitting', 'flexion_lifting', 'extension'],
      radiation: 'dull_ache', activityLevel: 'sedentary',
      redFlags: { caudaEquina: false }, functionalImpact: { sleep: 1, work: 1, exercise: 1, adl: 1 },
    },
    expectedOutputs: {
      riskLevel: 'ORANGE', riskTier: 'YELLOW', primaryHypothesis: 'hyp_flexion_intolerant',
      hypothesisConfidence: 'medium',
      gamesRecommended: { mustInclude: ['FA1', 'FA4', 'NN2'], mustNotInclude: ['FA5'] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'guided_program',
    },
  },
  {
    id: 'TC43',
    description: 'Morning stiffness >60min → AS differentiation flag',
    persona: 'Cross-Scan',
    inputFacts: {
      age: 28, bodyRegion: 'lumbar_spine', severity: 5, duration: 'chronic_over_12_weeks',
      aggravatingFactors: ['morning_stiffness'], morningStiffnessDuration: 75,
      radiation: 'dull_ache', redFlags: { caudaEquina: false, improvesWithExercise: true },
      functionalImpact: { sleep: 1, work: 1, exercise: 0, adl: 1 },
    },
    expectedOutputs: {
      riskLevel: 'ORANGE', riskTier: 'YELLOW', primaryHypothesis: '',
      hypothesisConfidence: '', gamesRecommended: { mustInclude: [], mustNotInclude: [] },
      conditionTags: ['AS_DIFFERENTIATION'], crossScanRecommended: ['spondylosis'],
      redFlagTriggered: true, redFlagId: 'rf_as_differentiation', carePathwayCategory: 'specialist',
    },
  },
  {
    id: 'TC44',
    description: 'Recurrent 3+ episodes → recommend DeepScan',
    persona: 'Cross-Scan',
    inputFacts: {
      bodyRegion: 'lumbar_spine', severity: 5, duration: 'chronic_over_12_weeks',
      aggravatingFactors: ['sitting'], priorConditions: 'recurrent',
      radiation: 'dull_ache', activityLevel: 'sedentary',
      redFlags: { caudaEquina: false }, functionalImpact: { sleep: 1, work: 1, exercise: 1, adl: 1 },
    },
    expectedOutputs: {
      riskLevel: 'ORANGE', riskTier: 'YELLOW', primaryHypothesis: 'hyp_deconditioning',
      hypothesisConfidence: 'medium', gamesRecommended: { mustInclude: [], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: ['deep_scan'],
      redFlagTriggered: false, carePathwayCategory: 'guided_program',
    },
  },
  {
    id: 'TC45',
    description: 'Post-surgical history → flag in prior conditions',
    persona: 'Cross-Scan',
    inputFacts: {
      bodyRegion: 'lumbar_spine', severity: 4, duration: 'chronic_over_12_weeks',
      aggravatingFactors: ['flexion_lifting'], priorConditions: 'post_surgical',
      radiation: 'dull_ache', activityLevel: 'lightly_active',
      redFlags: { caudaEquina: false }, functionalImpact: { sleep: 0, work: 1, exercise: 1, adl: 1 },
    },
    expectedOutputs: {
      riskLevel: 'ORANGE', riskTier: 'YELLOW', primaryHypothesis: 'hyp_flexion_intolerant',
      hypothesisConfidence: 'medium', gamesRecommended: { mustInclude: [], mustNotInclude: ['FA5'] },
      conditionTags: ['POST_SURGICAL'], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'specialist_review',
    },
  },

  // ═══════════════════════════════════════════
  // ADVERSARIAL INPUTS (46-50)
  // ═══════════════════════════════════════════

  {
    id: 'TC46',
    description: 'Empty fact store → insufficient data',
    persona: 'Adversarial',
    inputFacts: {},
    expectedOutputs: {
      riskLevel: null, riskTier: 'GREEN', primaryHypothesis: '',
      hypothesisConfidence: '', gamesRecommended: { mustInclude: [], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'insufficient_data',
    },
  },
  {
    id: 'TC47',
    description: 'Only severity, no body region → ask for body region',
    persona: 'Adversarial',
    inputFacts: { severity: 5 },
    expectedOutputs: {
      riskLevel: null, riskTier: 'GREEN', primaryHypothesis: '',
      hypothesisConfidence: '', gamesRecommended: { mustInclude: [], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'insufficient_data',
    },
  },
  {
    id: 'TC48',
    description: 'All red flags null → insist on screening',
    persona: 'Adversarial',
    inputFacts: {
      bodyRegion: 'lumbar_spine', severity: 5, aggravatingFactors: ['sitting'],
    },
    expectedOutputs: {
      riskLevel: null, riskTier: 'GREEN', primaryHypothesis: '',
      hypothesisConfidence: '', gamesRecommended: { mustInclude: [], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'incomplete_screening',
    },
  },
  {
    id: 'TC49',
    description: 'Invalid severity (negative) → should reject',
    persona: 'Adversarial',
    inputFacts: {
      bodyRegion: 'lumbar_spine', severity: -5, aggravatingFactors: ['sitting'],
      redFlags: { caudaEquina: false },
    },
    expectedOutputs: {
      riskLevel: null, riskTier: 'GREEN', primaryHypothesis: '',
      hypothesisConfidence: '', gamesRecommended: { mustInclude: [], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: [],
      redFlagTriggered: false, carePathwayCategory: 'invalid_input',
    },
  },
  {
    id: 'TC50',
    description: 'Body region "shoulder" in LBP tree → redirect',
    persona: 'Adversarial',
    inputFacts: {
      bodyRegion: 'shoulder_right', severity: 5, aggravatingFactors: ['lifting'],
      redFlags: { caudaEquina: false },
    },
    expectedOutputs: {
      riskLevel: null, riskTier: 'GREEN', primaryHypothesis: '',
      hypothesisConfidence: '', gamesRecommended: { mustInclude: [], mustNotInclude: [] },
      conditionTags: [], crossScanRecommended: ['shoulder_pain'],
      redFlagTriggered: false, carePathwayCategory: 'redirect',
    },
  },
];
