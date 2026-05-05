/**
 * Kriya QuickScan — Sciatica Module
 * PRD: docs/Kriya Scan/QuickScan by Condition/kriya_quickscan_sciatica_prd_v1.docx
 * Validation: NICE NG59, SciatPRO, LANSS, DN4, ODI, Centralization (McKenzie).
 * Tiers: LOW 0-11, MOD 12-24, HIGH 25+ or hard flag.
 */

import { asArray, asString } from '../engine';
import type { QSModule } from '../types';

const Q12_BELOW_KNEE = 'Below the knee — into the calf, shin, or outer/back of lower leg';
const Q12_TO_FOOT = 'All the way to the foot or toes (sole, heel, big toe, little toe)';
const Q22_MOTOR_C = 'Moderate weakness — difficulty lifting foot, climbing stairs, or pushing off when walking';
const Q22_MOTOR_D = 'Significant weakness — difficulty walking; my foot tends to drop or drag';

const sciatica: QSModule = {
  id: 'sciatica',
  kind: 'condition',
  displayName: 'Sciatica',
  shortDescription: 'Lumbar radicular leg pain — nerve root irritation pattern.',
  estimatedMinutes: 3,
  accent: '#a855f7',
  instruments: ['NICE NG59', 'SciatPRO', 'LANSS', 'DN4', 'ODI', 'McKenzie centralization'],
  disclaimer:
    'Kriya QuickScan is a self-reported wellness risk tool and does not constitute a medical diagnosis. Please consult a qualified clinician for assessment, diagnosis, or treatment.',
  intro: [
    'QuickScan — Sciatica. This 2-3 minute scan checks for nerve-root irritation patterns.',
    "We'll start with two safety screens, then ask about your leg pain pattern, neurological signs and how your symptoms are behaving.",
  ],
  questions: [
    {
      id: 'Q0.1',
      layer: 0,
      kind: 'multi-halt',
      prompt: 'In relation to your back or leg symptoms, are you experiencing any of the following?',
      source: 'NICE NG59 Cauda Equina criteria',
      haltLabel: 'None of the above',
      haltKind: 'emergency',
      options: [
        { label: 'Loss of control over bladder or bowels', points: 0 },
        { label: 'Numbness or tingling in the groin, inner thighs, or between the legs', points: 0 },
        { label: 'Sudden severe weakness in both legs', points: 0 },
        { label: 'None of the above', points: 0 },
      ],
    },
    {
      id: 'Q0.2',
      layer: 0,
      kind: 'multi-halt',
      prompt: 'Are you experiencing any of the following alongside your back or leg pain?',
      source: 'NICE NG59 progressive deficit + systemic',
      haltLabel: 'None of the above',
      haltKind: 'urgent',
      options: [
        { label: 'Leg or foot weakness getting noticeably worse over recent days', points: 0 },
        { label: 'Numbness in leg or foot spreading or worsening over 48–72 hours', points: 0 },
        { label: 'Fever, night sweats, or unexplained weight loss > 5 kg', points: 0 },
        { label: 'Pain following a fall, accident, or significant trauma', points: 0 },
        { label: 'Known history of cancer', points: 0 },
        { label: 'None of the above', points: 0 },
      ],
    },
    {
      id: 'Q1.1',
      layer: 1,
      kind: 'single-scored',
      prompt: 'Which best describes your pain pattern?',
      source: 'SciatPRO leg-dominant pain item',
      options: [
        { label: 'Mainly back pain — no significant pain into the leg', points: 0 },
        { label: 'Both back and leg pain — back is worse', points: 2 },
        { label: 'Both back and leg pain — leg is worse', points: 3 },
        { label: 'Mainly leg pain with little or no back pain', points: 3 },
        { label: 'Buttock or deep gluteal aching that does not clearly travel down the leg', points: 1 },
      ],
    },
    {
      id: 'Q1.2',
      layer: 1,
      kind: 'single-scored',
      prompt: 'How far down the leg do the pain or sensations travel?',
      source: 'NICE NG59 below-knee criterion; L4/L5/S1 dermatomal mapping',
      options: [
        { label: 'Buttock or hip area only', points: 1 },
        { label: 'Down to the back/side of thigh — stops above the knee', points: 2 },
        { label: Q12_BELOW_KNEE, points: 4 },
        { label: Q12_TO_FOOT, points: 4 },
      ],
    },
    {
      id: 'Q1.4',
      layer: 1,
      kind: 'multi-scored',
      maxSelect: 2,
      prompt: 'How would you describe the quality of the leg pain? (Up to 2)',
      source: 'LANSS / DN4 neuropathic items',
      options: [
        { label: 'Burning or hot pain travelling down the leg', points: 2 },
        { label: 'Electric shock, shooting, or stabbing — sudden jolts', points: 2 },
        { label: 'Deep aching or throbbing pain', points: 1 },
        { label: 'Pins and needles or tingling — like the leg is "asleep"', points: 2 },
        { label: 'Heaviness or weakness feeling in the leg', points: 1 },
      ],
    },
    {
      id: 'Q2.1',
      layer: 2,
      kind: 'single-scored',
      prompt: 'Sensory changes in the leg or foot?',
      source: 'NICE NG59 neurological criteria',
      options: [
        { label: 'No sensory changes — only pain', points: 0 },
        { label: 'Numbness or reduced sensation in part of the leg or foot', points: 2 },
        { label: 'Persistent tingling or pins-and-needles most of the time', points: 2 },
        { label: 'Significant numbness — area feels completely numb or "wooden"', points: 3 },
      ],
    },
    {
      id: 'Q2.2',
      layer: 2,
      kind: 'single-scored',
      prompt: 'Any leg or foot weakness — actual difficulty moving the limb?',
      source: 'NICE NG59 motor sign criteria',
      options: [
        { label: 'No — leg feels strong even if painful', points: 0 },
        { label: 'Mild weakness — slightly weaker but still functional', points: 1 },
        { label: Q22_MOTOR_C, points: 3 },
        { label: Q22_MOTOR_D, points: 4 },
      ],
    },
    {
      id: 'Q2.3',
      layer: 2,
      kind: 'multi-scored',
      prompt: 'Which positions or activities make the leg pain worse? (Select all)',
      source: 'SLR / Valsalva conceptual adaptation',
      options: [
        { label: 'Sitting for more than 15–20 minutes', points: 2 },
        { label: 'Bending forward — putting on shoes, picking up from floor', points: 2 },
        { label: 'Standing for prolonged periods', points: 1 },
        { label: 'Coughing, sneezing, or straining (pain shoots down)', points: 2 },
        { label: 'Walking — pain builds after a distance, eases with rest', points: 1 },
      ],
    },
    {
      id: 'Q3.1',
      layer: 3,
      kind: 'single-scored',
      prompt: 'How long has this current episode been going on?',
      source: 'ODI duration; NICE NG59 chronicity (>12 weeks)',
      options: [
        { label: 'Less than 6 weeks', points: 0 },
        { label: '6–12 weeks', points: 1 },
        { label: 'More than 12 weeks', points: 2 },
      ],
    },
    {
      id: 'Q3.2',
      layer: 3,
      kind: 'single-scored',
      prompt: 'Thinking about your leg pain, which feels closest to how you feel?',
      source: 'STarT Back psychosocial adaptation',
      options: [
        { label: 'Confident — I just need the right approach', points: 0 },
        { label: 'Unsure — keeps recurring; I feel uncertain', points: 1 },
        { label: 'I avoid movements because I worry about making it worse', points: 2 },
        { label: 'It significantly affects my mood, work, and sense of independence', points: 3 },
      ],
    },
  ],
  tiers: { lowMax: 11, moderateMax: 24 },
  hardFlags: [
    {
      id: 'moderate-motor',
      description: 'Q2.2 — moderate motor weakness',
      matches: (a) => asString(a['Q2.2']) === Q22_MOTOR_C,
    },
    {
      id: 'foot-drop',
      description: 'Q2.2 — foot drop / significant weakness',
      matches: (a) => asString(a['Q2.2']) === Q22_MOTOR_D,
    },
    {
      id: 'foot-pain-with-numbness',
      description: 'Q1.2 to foot/toes + Q2.1 complete numbness',
      matches: (a) =>
        asString(a['Q1.2']) === Q12_TO_FOOT &&
        asString(a['Q2.1']) === 'Significant numbness — area feels completely numb or "wooden"',
    },
    {
      id: 'chronic-with-motor',
      description: 'Q3.1 chronic + any motor weakness',
      matches: (a) =>
        asString(a['Q3.1']) === 'More than 12 weeks' &&
        (asString(a['Q2.2']) === Q22_MOTOR_C || asString(a['Q2.2']) === Q22_MOTOR_D),
    },
  ],
  conditionTags: [
    {
      tag: 'Below-knee radiation',
      matches: (a) =>
        asString(a['Q1.2']) === Q12_BELOW_KNEE || asString(a['Q1.2']) === Q12_TO_FOOT,
    },
    {
      tag: 'Neuropathic quality',
      matches: (a) => {
        const sel = asArray(a['Q1.4']);
        return (
          sel.includes('Burning or hot pain travelling down the leg') ||
          sel.includes('Electric shock, shooting, or stabbing — sudden jolts')
        );
      },
    },
    {
      tag: 'Valsalva sign',
      matches: (a) =>
        asArray(a['Q2.3']).includes('Coughing, sneezing, or straining (pain shoots down)'),
    },
    {
      tag: 'Chronic sciatica',
      matches: (a) => asString(a['Q3.1']) === 'More than 12 weeks',
    },
  ],
  routing: {
    low: {
      interpretation:
        'Mild sciatica pattern — likely early or minor nerve-root irritation. High probability of self-resolution with active management.',
      primaryCTA: { label: 'Start a Muscle Memory programme', destination: 'kriya-play', subProgram: 'muscle-memory' },
      secondaryCTA: { label: 'Read: "Keep moving — gentle activity accelerates recovery"', destination: 'myo-ai' },
      tip: 'Most leg pain that stays above the knee resolves with active management within 4-6 weeks.',
    },
    moderate: {
      interpretation:
        'Established sciatica pattern — leg pain below the knee with neuropathic quality and some neurological signs.',
      primaryCTA: { label: 'Begin Kriya Care — Sciatica Programme', destination: 'kriya-care', subProgram: 'walk-more' },
      secondaryCTA: { label: 'Ask Myo AI about sciatica', destination: 'myo-ai' },
      tertiaryCTA: { label: 'Detailed assessment with DeepScan', destination: 'deepscan' },
      tip: 'Nerve-glide / McKenzie work plus core stability is the evidence-based first line.',
    },
    high: {
      interpretation:
        'Significant sciatica burden with neurological signs. Specialist neurosurgical or orthopaedic evaluation is recommended.',
      primaryCTA: { label: 'See a spine specialist', destination: 'specialist' },
      secondaryCTA: { label: 'Begin Kriya Care while you wait', destination: 'kriya-care' },
      tertiaryCTA: { label: 'Strongly recommended — DeepScan', destination: 'deepscan' },
      mandatoryDeepScanPrompt: true,
      tip: 'Foot drop, progressive weakness, or below-knee numbness with motor signs warrants prompt assessment.',
    },
  },
};

export default sciatica;
