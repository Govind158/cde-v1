/**
 * Kriya QuickScan — Low Back Pain Module
 *
 * PRD source: docs/Kriya Scan/QuickScan by Location/kriya_quickscan_low back_prd_v1.docx
 * Validation: ODI, RMDQ, STarT Back, Keele STarT Back, NICE NG59, Nordic MSQ
 *
 * Tier thresholds (PRD §5.2):
 *   LOW       0 – 8
 *   MODERATE  9 – 16
 *   HIGH      17+ OR any hard flag
 *
 * Hard flags (PRD §5.2 *):
 *   (a) Q1.2a Option C — leg pain below knee
 *   (b) Q2.2 Option D — cannot find comfortable rest position
 *   (c) Q3.2 Option D — pain significantly affects mood
 *   (d) Q3.3 — any 2+ prior conditions selected
 */

import { asArray, asString } from '../engine';
import type { QSModule } from '../types';

const Q11_DURATION_OPTS = [
  { label: 'Less than 2 weeks (new episode)', points: 1 },
  { label: '2–6 weeks (sub-acute)', points: 2 },
  { label: '6 weeks to 3 months', points: 3 },
  { label: 'More than 3 months (persistent)', points: 4 },
];

const Q12_CHARACTER_OPTS = [
  { label: 'Dull ache or stiffness, mostly in the lower back', points: 1 },
  { label: 'Sharp or burning pain in the lower back', points: 2 },
  { label: 'Pain that travels into one or both buttocks', points: 3 },
  { label: 'Pain, tingling, or numbness that travels down one or both legs', points: 4 },
];

const Q12A_LEG_EXTENT_OPTS = [
  { label: 'Only into the buttock or hip area', points: 1 },
  { label: 'Down to the back of the thigh but not below the knee', points: 2 },
  { label: 'Below the knee — into the calf, shin, foot, or toes', points: 3 },
];

const lowBackModule: QSModule = {
  id: 'low-back',
  kind: 'location',
  displayName: 'Low Back Pain',
  deepScanRegion: 'Lower back',
  shortDescription:
    'Postural, sciatic and chronic low-back signal patterns — mapped to ODI / NICE NG59.',
  estimatedMinutes: 3,
  accent: '#14b8a6',
  instruments: [
    'Oswestry Disability Index (ODI)',
    'Roland-Morris Disability Questionnaire',
    'STarT Back Screening Tool',
    'NICE NG59 Low Back Pain Guidelines',
    'Nordic Musculoskeletal Questionnaire',
  ],
  disclaimer:
    'Kriya QuickScan is a self-reported wellness risk tool and does not constitute a medical diagnosis. The risk signals generated are based on your responses and are intended to guide general awareness only. Please consult a qualified healthcare professional for clinical assessment, diagnosis, or treatment.',
  intro: [
    "QuickScan — Low Back. This is a 2–3 minute risk-signal scan, not a diagnosis.",
    "We'll start with two safety screens, then a few short questions about your symptoms and how the pain is affecting you.",
  ],
  questions: [
    // ── LAYER 0 — RED FLAG SCREENS ───────────────────────────────
    {
      id: 'Q0.1',
      layer: 0,
      kind: 'multi-halt',
      prompt:
        'In relation to your back or leg symptoms, are you currently experiencing any of the following?',
      helper: 'Tick every one that applies. If none apply, tick "None of the above".',
      source: 'NICE NG59 Red Flag Guidelines',
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
      prompt: 'Have you experienced any of the following alongside your back pain?',
      helper: 'Tick every one that applies. If none apply, tick "None of the above".',
      source: 'NICE NG59 / RMDQ systemic flags',
      haltLabel: 'None of the above',
      haltKind: 'urgent',
      options: [
        { label: 'Unexplained weight loss of more than 5 kg in the past 3 months', points: 0 },
        { label: 'Persistent fever or night sweats', points: 0 },
        { label: 'History of cancer', points: 0 },
        { label: 'Back pain following a fall, accident, or injury', points: 0 },
        { label: 'None of the above', points: 0 },
      ],
    },

    // ── LAYER 1 — SYMPTOM PROFILE ────────────────────────────────
    {
      id: 'Q1.1',
      layer: 1,
      kind: 'single-scored',
      prompt: 'How long have you been experiencing lower back pain or discomfort?',
      source: 'RMDQ / Nordic MSQ duration classification',
      options: Q11_DURATION_OPTS,
    },
    {
      id: 'Q1.2',
      layer: 1,
      kind: 'multi-scored',
      maxSelect: 2,
      prompt: 'How would you best describe your lower back pain? (Select up to 2)',
      source: 'ODI / RMDQ pain character; Nordic MSQ radiation mapping',
      options: Q12_CHARACTER_OPTS,
    },
    {
      id: 'Q1.2a',
      layer: 1,
      kind: 'single-scored',
      prompt: 'Where does the pain, tingling, or numbness travel to?',
      source: 'ODI leg pain item; NICE NG59 radiculopathy criteria',
      options: Q12A_LEG_EXTENT_OPTS,
      // Triggered only if Q1.2 contained the radiating-leg option.
      showWhen: (a) =>
        asArray(a['Q1.2']).includes(
          'Pain, tingling, or numbness that travels down one or both legs',
        ),
    },

    // ── LAYER 2 — FUNCTIONAL IMPACT ──────────────────────────────
    {
      id: 'Q2.1',
      layer: 2,
      kind: 'matrix-scored',
      prompt:
        'In the past 2 weeks, how much has your lower back pain affected your ability to do the following?',
      helper: 'Rate each: Not at all / A little / Quite a bit / Cannot do at all',
      source: 'ODI Sections 3, 5, 6, 7',
      subItems: [
        { id: 'A', label: 'Sitting for more than 30 minutes' },
        { id: 'B', label: 'Standing for more than 20 minutes' },
        { id: 'C', label: 'Bending forward to pick something up' },
        { id: 'D', label: 'Walking more than 15 minutes continuously' },
      ],
      matrixSubScoreThreshold: { min: 7, bonusPoints: 2 },
    },
    {
      id: 'Q2.2',
      layer: 2,
      kind: 'single-scored',
      prompt: 'Does your lower back pain disturb your sleep or cause discomfort when resting?',
      source: 'ODI sleeping section; RMDQ item 8',
      options: [
        { label: 'No — I can sleep and rest without pain', points: 0 },
        { label: 'Occasionally disturbed but manageable', points: 1 },
        { label: 'Regularly disrupted — I wake up due to pain', points: 2 },
        { label: 'Severe — I cannot find a comfortable position to rest', points: 3 },
      ],
    },

    // ── LAYER 3 — RISK MODIFIERS ─────────────────────────────────
    {
      id: 'Q3.1',
      layer: 3,
      kind: 'single-scored',
      prompt: 'Which of the following best describes your daily activity pattern?',
      source: 'STarT Back Tool lifestyle factor; Nordic MSQ occupational exposure',
      options: [
        { label: 'Mostly active — physical work or regular exercise more than 4× per week', points: 0 },
        { label: 'Moderately active — some movement but mostly desk-based', points: 1 },
        { label: 'Sedentary — sitting for more than 6 hours a day with minimal exercise', points: 2 },
        { label: 'Heavy manual work — frequent lifting, bending, or carrying', points: 2 },
      ],
    },
    {
      id: 'Q3.2',
      layer: 3,
      kind: 'single-scored',
      prompt:
        'Thinking about your back pain, which of these statements feels closest to how you feel?',
      helper: 'Honest self-reflection helps the scan tune to your situation.',
      source: 'STarT Back items 7, 8, 9 (fear-avoidance, distress, catastrophising)',
      options: [
        { label: 'I think it will improve on its own with rest and care', points: 0 },
        { label: 'I am not sure if it will get better — it keeps coming and going', points: 1 },
        { label: 'I worry that activity or movement will make it worse', points: 2 },
        { label: 'I feel my back pain significantly affects my mood and daily confidence', points: 3 },
      ],
      // Shown if Q1.1 indicates 6w+ persistent pain.
      showWhen: (a) => {
        const v = asString(a['Q1.1']);
        return v === '6 weeks to 3 months' || v === 'More than 3 months (persistent)';
      },
    },
    {
      id: 'Q3.3',
      layer: 3,
      kind: 'multi-scored',
      prompt:
        'Have you previously been diagnosed with or treated for any of the following?',
      helper: 'Select all that apply.',
      source: 'Clinical history intake; ODI prior treatment items',
      options: [
        { label: 'A slipped disc, disc bulge, or herniated disc', points: 1 },
        { label: 'Sciatica or nerve pain radiating to the leg', points: 1 },
        { label: 'Spondylosis, spondylolisthesis, or spinal degeneration', points: 1 },
        { label: 'Spinal surgery or procedure', points: 1 },
        { label: 'None of the above / Not sure', points: 0 },
      ],
    },
  ],

  tiers: { lowMax: 8, moderateMax: 16 },

  hardFlags: [
    {
      id: 'leg-pain-below-knee',
      description: 'Q1.2a — leg pain extending below the knee (significant radiculopathy signal)',
      matches: (a) =>
        asString(a['Q1.2a']) === 'Below the knee — into the calf, shin, foot, or toes',
    },
    {
      id: 'severe-rest-disruption',
      description: 'Q2.2 — cannot find a comfortable position to rest',
      matches: (a) =>
        asString(a['Q2.2']) === 'Severe — I cannot find a comfortable position to rest',
    },
    {
      id: 'mood-impact',
      description: 'Q3.2 — pain significantly affects mood and daily confidence',
      matches: (a) =>
        asString(a['Q3.2']) ===
        'I feel my back pain significantly affects my mood and daily confidence',
    },
    {
      id: 'multi-prior-conditions',
      description: 'Q3.3 — two or more prior back conditions selected',
      matches: (a) => {
        const sel = asArray(a['Q3.3']).filter((s) => s !== 'None of the above / Not sure');
        return sel.length >= 2;
      },
    },
  ],

  conditionTags: [
    {
      tag: 'Sciatica signal',
      matches: (a) =>
        asString(a['Q1.2a']) === 'Below the knee — into the calf, shin, foot, or toes' ||
        asString(a['Q1.2a']) === 'Down to the back of the thigh but not below the knee',
    },
    {
      tag: 'Disc-related signal',
      matches: (a) =>
        asArray(a['Q1.2']).includes(
          'Pain, tingling, or numbness that travels down one or both legs',
        ),
    },
    {
      tag: 'Sedentary risk',
      matches: (a) =>
        asString(a['Q3.1']) ===
        'Sedentary — sitting for more than 6 hours a day with minimal exercise',
    },
    {
      tag: 'Psychosocial risk',
      matches: (a) => {
        const v = asString(a['Q3.2']);
        return (
          v === 'I worry that activity or movement will make it worse' ||
          v === 'I feel my back pain significantly affects my mood and daily confidence'
        );
      },
    },
    {
      tag: 'Chronic pattern',
      matches: (a) => asString(a['Q1.1']) === 'More than 3 months (persistent)',
    },
  ],

  routing: {
    low: {
      interpretation:
        'Mild or early-stage discomfort. Your responses suggest postural or lifestyle-related signals without significant functional impairment.',
      primaryCTA: { label: 'Explore Muscle Mood games', destination: 'kriya-play', subProgram: 'muscle-mood' },
      secondaryCTA: { label: 'See your Muscle Age', destination: 'kriya-play', subProgram: 'muscle-age' },
      tip: 'Try a 90-second desk-posture reset every 60 minutes — small, frequent breaks reduce postural load far more than one long stretch.',
    },
    moderate: {
      interpretation:
        'Sub-acute or recurrent back pain with measurable functional impact. Your signals warrant a structured intervention.',
      primaryCTA: { label: 'Start your Muscle Memory programme', destination: 'kriya-play', subProgram: 'muscle-memory' },
      secondaryCTA: { label: 'Ask Myo AI about your symptoms', destination: 'myo-ai' },
      tertiaryCTA: { label: 'Get a detailed assessment with DeepScan', destination: 'deepscan' },
      tip: 'Avoid bed rest. Staying gently active (walking, low-load mobility work) is associated with better recovery than rest.',
    },
    high: {
      interpretation:
        'Persistent, functionally limiting back pain with elevated risk signals. Your responses suggest professional evaluation is warranted.',
      primaryCTA: { label: 'Begin a Kriya Care programme', destination: 'kriya-care', subProgram: 'walk-more' },
      secondaryCTA: { label: 'Ask Myo AI for clarity now', destination: 'myo-ai' },
      tertiaryCTA: { label: 'Strongly recommended — DeepScan', destination: 'deepscan' },
      mandatoryDeepScanPrompt: true,
      tip: 'Please do not delay clinical input. Arrange a specialist consult and consider DeepScan for a deeper signal map before that visit.',
    },
  },
};

export default lowBackModule;
